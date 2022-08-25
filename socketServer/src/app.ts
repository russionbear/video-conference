import express from 'express'
import http from "http"
import fff, { Server } from "socket.io"
import routes, { routesIo } from './routes';
import NetCfg from './config/NetCfg';

import * as bodyParser from "body-parser";


const app = express();
const server = http.createServer(app)

const io = fff(server)
// const io = new Server(server)
// const io = new Server(server, {cors: {origin:"http://localhost:8082", credentials: true}})

// app.use(bodyParser.json());
// app.use(express.urlencoded({ extended: false }))
// app.use(express.json())
// const app_ = expressWs(app);


routesIo(io)


// 启动
server.listen(NetCfg.port, async () => {
    console.log(`App is running at http://localhost:${NetCfg.port}`)

})