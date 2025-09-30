import mongoose from 'mongoose';

type connectionObject = {
    isConnected?: number
}

const connection: connectionObject = {}

async function dbConnect(): Promise<void> {
    // Check if already connected
    if (connection.isConnected) {
        console.log("Database is already connected");
        return;
    }

    // Check if MONGO_URI exists
    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is not defined in environment variables");
        process.exit(1);
    }

    try {
        const db = await mongoose.connect(process.env.MONGO_URI);
        connection.isConnected = db.connections[0].readyState;
        console.log("Database connected successfully");

        // Handle connection events
        mongoose.connection.on('connected', () => {
            console.log('Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            console.error('Mongoose connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Mongoose disconnected');
        });

    } catch (error) {
        console.error("Database connection error:", error);
        console.log("Error connecting to database");
        process.exit(1);
    }
}

export default dbConnect;