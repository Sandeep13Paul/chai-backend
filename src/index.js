// require('dotenv').config({path: './env'})
import dotenv from 'dotenv'
import { app } from './app.js';
import connectDB from "./db/index.js";

dotenv.config(() => {
    path: './env'
})


connectDB()
.then(( ) => {
    app.on('error', (err) => console.log(err));
    app.listen(process.env.PORT || 8000, () => {
        console.log('Server is running on port ' + process.env.PORT);
    })
})
.catch((err) => {
    console.log('MONGODB CONNECTION FAILED: ' + err)
})




/*
import express from "express";

// function connectDB(){}

// connectDB()

const app = express();

( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on('error', (err) => console.log(err));

        app.listen(process.env.MONGODB_URI, () => {
            console.log(`App is listening on port ${process.env.MONGODB_URI}`);
        })
    } catch (error) {
        console.error(error);
    }
})()
*/