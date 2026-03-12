const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');

// Load env vars
dotenv.config();

const listenToEvents = require('./listeners/contractEvents');

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/credentials', require('./routes/credentialRoutes'));
app.use('/api/verify', require('./routes/verifyRoutes'));
app.use('/api/shares', require('./routes/shareRoutes'));
app.use('/api/devrep', require('./routes/devRepRoutes'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to DeID API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Server Error'
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    
    if (process.env.BLOCKCHAIN_TYPE !== 'fabric') {
        listenToEvents(); // Start listening to blockchain (Ethereum mode)
    } else {
        console.log('Hyperledger Fabric mode enabled. Skipping legacy Ethereum event listeners.');
    }
});
