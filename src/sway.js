#!/usr/bin/gjs --include-path=.
'use strict';

imports.searchPath.unshift('.');

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const struct = imports.utils.struct;
const concatArrayBuffers = imports.utils.concatArrayBuffers;

EventType = {
    WORKSPACE: 1,
    OUTPUT: 1,
    MODE: 2,
    WINDOW: 3,
    BARCONFIG_UPDATE: 4,
    BINDING: 5,
    SHUTDOWN: 6,
    TICK: 7,
    INPUT: 21,
}

/**
 * 
 * @class
 * @classdesc [TODO:class]
 */
class Sway{
    #SWAYSOCK = GLib.getenv('SWAYSOCK');
    #MAGIC = "i3-ipc";
    #STRUCT_HEADER = "<6sII";
    #STRUCT_HEADER_LENGTH = 14;
    #MsgType = {
        RUN_COMMAND: 0,
        GET_WORKSPACES: 1,
        SUBSCRIBE: 2,
        GET_OUTPUTS: 3,
        GET_TREE: 4,
        GET_MARKS: 5,
        GET_BAR_CONFIG: 6,
        GET_VERSION: 7,
        GET_BINDING_MODES: 8,
        GET_CONFIG: 9,
        SEND_TICK: 10,
        SYNC: 11,
        GET_BINDING_STATE: 12,
        GET_INPUTS: 100,
        GET_SEATS: 101,
    }

    constructor(){
        this.socketAddress = new Gio.UnixSocketAddress({path: this.#SWAYSOCK});
        console.log(this.socketAddress);
    }

    #pack(msg_type, payload){
        console.log(`pack: ${msg_type} - ${payload}`);
        const m = (new TextEncoder()).encode(this.#MAGIC);
        const pb = (new TextEncoder()).encode(payload);
        const s = new Uint8Array(struct("<II").pack(pb.length, msg_type));
        return concatArrayBuffers(m, s, pb);
    }

    #unpack_header(data){
        console.log("unpack_header");
        const slice = data.slice(0, this.#STRUCT_HEADER_LENGTH);
        return struct(this.#STRUCT_HEADER).unpack(slice.buffer);
    }

    #unpack(data){
        console.log("unpack");
        const [msg_magic, msg_length, msg_type] = this.#unpack_header(data)
        const msg_size = this.#STRUCT_HEADER_LENGTH + msg_length;
        const payload = data.slice(this.#STRUCT_HEADER_LENGTH, msg_size);
        return (new TextDecoder()).decode(payload);
    }

    #recv(connection){
        console.log(`recv: ${connection}`);
        const input = connection.get_input_stream();
        let data = input.read_bytes(this.#STRUCT_HEADER_LENGTH, null).get_data();
        const [msg_magic, msg_length, msg_type] = this.#unpack_header(data);
        const msg_size = this.#STRUCT_HEADER_LENGTH + msg_length;
        console.log(data.length);
        while(data.length < msg_size){
            const new_input = input.read_bytes(msg_length, null).get_data();
            const new_data = new Uint8Array(data.length + new_input.length)
            new_data.set(data, 0);
            new_data.set(new_input, data.length);
            data = new_data;
        }
        const response = this.#unpack(data);
        return JSON.parse(response);
    }

    #send(msg_type, payload=''){
        let connection = null;
        try {
            let client = new Gio.SocketClient();
            connection = client.connect(this.socketAddress, null);
            if (!connection) {
                throw "Connection failed"
            }
            let output = connection.get_output_stream();
            output.write_bytes(this.#pack(msg_type, payload), null);
            const response = this.#recv(connection);
            console.log(`Message type: ${msg_type}. Payload: ${payload}. Response: ${response}`);
            return response
        } catch (err) {
            console.error(err);
            return false;
        }finally{
            if (connection != null){
                connection.close(null);
            }
        }
    }

    /**
     * @param {any} command
     * @returns {[TODO:return]} [TODO:description]
     */
    runCommand(command){
        console.log("runCommand");
        return this.#send(this.#MsgType.RUN_COMMAND, command);
    }

    subscribe(events=[]){
        console.log("subscribe");
        return this.#send(this.#MsgType.SUBSCRIBE, payload);
    }

    getVersion(){
        console.log("getVersion");
        return this.#send(this.#MsgType.GET_VERSION);
    }

    getBarConfigList(){
        console.log("getBarConfigList");
        return this.#send(this.#MsgType.GET_BAR_CONFIG);
    }

    getBarConfig(barId=null){
        console.log("getBarConfig");
        if(barId === null){
            const barConfigList = this.getBarConfigList()
            if(barConfigList.length == 0){
                return null;
            }
            barId = barConfigList[0];
        }
        return this.#send(this.#MsgType.GET_BAR_CONFIG, barId);
    }

    getOutputs(){
        console.log("getOutputs");
        return this.#send(this.#MsgType.GET_OUTPUTS);
    }

    getInputs(){
        console.log("getInputs");
        return this.#send(this.#MsgType.GET_INPUTS);
    }

    getSeats(){
        console.log("getInputs");
        return this.#send(this.#MsgType.GET_SEATS);
    }

    getWorkspaces(){
        console.log("getWorkspaces");
        return this.#send(this.#MsgType.GET_WORKSPACES);
    }

    getTree(){
        console.log("getTree");
        return this.#send(this.#MsgType.GET_TREE);
    }

    getMarks(){
        console.log("getMarks");
        return this.#send(this.#MsgType.GET_MARKS);
    }

    getBindingModes(){
        console.log("getBindingModes");
        return this.#send(this.#MsgType.GET_BINDING_MODES);
    }

    getConfig(){
        console.log("getConfig");
        return this.#send(this.#MsgType.GET_CONFIG);
    }

    sendTick(payload = ""){
        console.log("sendTick");
        return this.#send(this.#MsgType.SEND_TICK, payload);
    }

    sync(){
        console.log("sync");
        return this.#send(this.#MsgType.SYNC);
    }

    /**
     * @returns {[TODO:return]} [TODO:description]
     */
    getBindingState(){
        console.log("getBindingState");
        return this.#send(this.#MsgType.GET_BINDING_STATE);
    }
}


//makeRequest(0, 'border none');
//makeRequest(1);
//const subs = new Array();
//subs.push("workspace");
//subs.push("output");
//makeRequest(2, JSON.stringify(subs));
const sway = new Sway();
//console.log(sway.getOutputs());
//console.log(sway.getVersion());
//console.log(sway.getBarConfigList());
//console.log(sway.getBarConfig());
//console.log(sway.getInputs());
//console.log(sway.getSeats());
//console.log(sway.getWorkspaces());
//console.log(sway.getTree());
console.log(sway.getMarks());
console.log(sway.getBindingModes());
console.log(sway.getConfig());
console.log(sway.sendTick());
console.log(sway.sync());
console.log("========================");
console.log(sway.getBindingState());
console.log("========================");
