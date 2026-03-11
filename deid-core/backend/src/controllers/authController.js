const crypto = require('crypto');
const ethers = require('ethers');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '30d'
    });
};

// Normalize sent role strings to our enum values
const normalizeRole = (role) => {
    if (!role) return 'CITIZEN';
    const map = {
        individual: 'CITIZEN',
        user: 'CITIZEN',
        citizen: 'CITIZEN',
        issuer: 'ISSUER_OFFICER',
        issuer_officer: 'ISSUER_OFFICER',
        ISSUER_OFFICER: 'ISSUER_OFFICER',
        approver: 'APPROVER',
        APPROVER: 'APPROVER',
        admin: 'ADMIN',
        ADMIN: 'ADMIN',
        CITIZEN: 'CITIZEN',
    };
    return map[role] || map[role.toLowerCase()] || 'CITIZEN';
};

// @desc    Signup with Email
// @route   POST /auth/signup
// @access  Public
exports.signup = async (req, res, next) => {
    try {
        const {
            email, password, name, role,
            // Role-specific fields
            organizationName, employeeId, department,
            licenseNumber, registrarId, companyId,
            verifierType, website, description
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide email and password' });
        }

        let user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            return res.status(400).json({ success: false, error: 'User already exists with this email' });
        }

        const normalizedRole = normalizeRole(role);
        const mockWallet = '0x' + crypto.randomBytes(20).toString('hex');

        user = await User.create({
            email: email.toLowerCase(),
            name,
            role: normalizedRole,
            walletAddress: mockWallet,
            did: `did:ethr:sepolia:${mockWallet}`,
            // Role-specific fields (only defined ones will be saved)
            ...(organizationName && { organizationName }),
            ...(employeeId      && { employeeId }),
            ...(department      && { department }),
            ...(licenseNumber   && { licenseNumber }),
            ...(registrarId     && { registrarId }),
            ...(companyId       && { companyId }),
            ...(verifierType    && { verifierType }),
            ...(website         && { website }),
            ...(description     && { description }),
        });

        const token = generateToken(user._id);
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                walletAddress: user.walletAddress,
                did: user.did,
                organizationName: user.organizationName,
                employeeId: user.employeeId,
                department: user.department,
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        next(error);
    }
};

// @desc    Login with Email
// @route   POST /auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide email and password' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const token = generateToken(user._id);
        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                walletAddress: user.walletAddress,
                did: user.did,
                organizationName: user.organizationName,
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get nonce for wallet signature
// @route   POST /auth/nonce
// @access  Public
exports.getNonce = async (req, res, next) => {
    try {
        const { walletAddress, role, name, organizationName, employeeId, department,
                licenseNumber, registrarId, companyId, verifierType } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ success: false, error: 'Please provide a wallet address' });
        }

        const formattedAddress = walletAddress.toLowerCase();
        let user = await User.findOne({ walletAddress: formattedAddress });

        const nonce = crypto.randomBytes(16).toString('hex');
        const nonceMessage = `DeID Auth Nonce: ${nonce}`;
        const normalizedRole = normalizeRole(role);

        if (!user) {
            // Register new wallet user automatically
            user = await User.create({
                walletAddress: formattedAddress,
                role: normalizedRole,
                did: `did:ethr:sepolia:${formattedAddress}`,
                nonce: nonceMessage,
                ...(name             && { name }),
                ...(organizationName && { organizationName }),
                ...(employeeId       && { employeeId }),
                ...(department       && { department }),
                ...(licenseNumber    && { licenseNumber }),
                ...(registrarId      && { registrarId }),
                ...(companyId        && { companyId }),
                ...(verifierType     && { verifierType }),
            });
        } else {
            user.nonce = nonceMessage;
            if (!user.did) user.did = `did:ethr:sepolia:${formattedAddress}`;
            // Don't downgrade role
            if (normalizedRole && normalizedRole !== 'CITIZEN') {
                user.role = normalizedRole;
            }
            // Merge profile fields if provided
            if (name)             user.name = name;
            if (organizationName) user.organizationName = organizationName;
            if (employeeId)       user.employeeId = employeeId;
            if (department)       user.department = department;
            if (licenseNumber)    user.licenseNumber = licenseNumber;
            if (registrarId)      user.registrarId = registrarId;
            if (companyId)        user.companyId = companyId;
            if (verifierType)     user.verifierType = verifierType;
            await user.save();
        }

        res.status(200).json({ success: true, nonce: nonceMessage });
    } catch (error) {
        console.error('getNonce error:', error.message);
        next(error);
    }
};

// @desc    Verify wallet signature and login
// @route   POST /auth/verify
// @access  Public
exports.verifySignature = async (req, res, next) => {
    try {
        const { walletAddress, signature } = req.body;

        if (!walletAddress || !signature) {
            return res.status(400).json({ success: false, error: 'Please provide wallet address and signature' });
        }

        const formattedAddress = walletAddress.toLowerCase();
        const user = await User.findOne({ walletAddress: formattedAddress });

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const recoveredAddress = ethers.verifyMessage(user.nonce, signature);

        if (recoveredAddress.toLowerCase() !== formattedAddress) {
            return res.status(401).json({ success: false, error: 'Signature verification failed' });
        }

        // Rotate nonce for security
        user.nonce = `DeID Auth Nonce: ${crypto.randomBytes(16).toString('hex')}`;
        await user.save();

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                walletAddress: user.walletAddress,
                role: user.role,
                did: user.did,
                organizationName: user.organizationName,
                employeeId: user.employeeId,
                department: user.department,
                licenseNumber: user.licenseNumber,
                registrarId: user.registrarId,
                companyId: user.companyId,
                verifierType: user.verifierType,
            }
        });
    } catch (error) {
        console.error('verifySignature error:', error);
        next(error);
    }
};

// @desc    Get current logged in user
// @route   GET /auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /auth/me
// @access  Private
exports.updateMe = async (req, res, next) => {
    try {
        const fieldsToUpdate = {
            name: req.body.name,
            email: req.body.email,
            organizationName: req.body.organizationName,
            website: req.body.website,
            description: req.body.description,
            employeeId: req.body.employeeId,
            department: req.body.department,
            licenseNumber: req.body.licenseNumber,
            registrarId: req.body.registrarId,
            companyId: req.body.companyId,
            verifierType: req.body.verifierType,
        };

        Object.keys(fieldsToUpdate).forEach(key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]);

        const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, { new: true, runValidators: true });

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};
