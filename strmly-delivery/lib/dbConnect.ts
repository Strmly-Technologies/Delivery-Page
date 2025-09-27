import mongoose  from 'mongoose';

type connectionObject={
    isConnected?:number
}

const connection:connectionObject={}

async function dbConnect():Promise<void>{
    if(connection.isConnected){
        return console.log("database is already connected")   
}
    try {
        const db=mongoose.connect(process.env.MONGO_URI!)
        connection.isConnected=(await db).connections[0].readyState
        console.log("database connected")
    } catch (error) {
        console.error(error)
        console.log("Error connecting to database")
        process.exit()   
    }
}

export default dbConnect;