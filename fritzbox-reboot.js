/*jshint
esversion: 8
*/
"use strict";

const debug = true;
if (debug) {
  log("debug active");
}

const fs = require("fs");
const net = require("net");
const Fritzbox = require("@seydx/fritzbox");
const homedir = require("os").homedir();

const config = {
  fritzbox: {
    user: "fritz8946",
    passwd: "",
    passwdPath: homedir + "/fritzboxPasswd", // File which contains the password.
    ipAdress: "192.168.178.1",  // IP-Address of the fritzbox
    minUptime: 600,             // seconds. Reboot only if uptime > minUptime.
  },
  testConnection: {
    dontTest: false,            // If true the fritzbox will allways rebooted.
    target: "www.google.com",   // hostname or IP-address
    port: 443,
    timeout: 3000,
  },
};

getPassword();
if (!config.fritzbox.passwd) return;

const fritzbox = new Fritzbox({ username: config.fritzbox.user, password: config.fritzbox.passwd, });

if (config.testConnection.dontTest) {
  reboot();
  return;
}

testConnection(
  config.testConnection.target,
  config.testConnection.port,
  config.testConnection.timeout,
  (_, output) => {
    if (!output.success) {
      // no internet connection. reboot required
      getUptime(uptime => {
        log("uptime=" + uptime);
        if (uptime === 0) {
          log("uptime invalid. no reboot.");
          return;
        }
        if (uptime > config.fritzbox.minUptime) {
          reboot();
          return;
        }
        log(`last reboot less then ${config.fritzbox.minUptime} seconds ago (${uptime} seconds)`);
      });
    } else {
      if (debug) {
        log("internet connection available");
      }
    }
  }
);


function getPassword() {
  if (!config.fritzbox.passwd) {
    // read password from file
    if (!config.fritzbox.passwdPath) {
      log("path invalid");
      return;
    }
    readFile(config.fritzbox.passwdPath, (ret) => {
      config.fritzbox.passwd = ret;
    });
  }
  if (!config.fritzbox.passwd) {
    log("password invalid");
    return;
  }
}

async function reboot() {
  try {
    log("Reboot started.");

    if (debug) return;

    await fritzbox.exec(
      "urn:DeviceConfig-com:serviceId:DeviceConfig1",
      "Reboot",
    );
  } catch (err) {
    console.error(err);
  }
}

async function getUptime(callback) {
  try {
    const info = await fritzbox.exec(
      "urn:DeviceInfo-com:serviceId:DeviceInfo1",
      "GetInfo",
    );

    if (info.NewUpTime == null) {
      throw new Error(info);
    }

    callback(info.NewUpTime);
  } catch (err) {
    console.error(err);
    callback(0);
  }
}

function readFile(path, callback) {
  let output;

  try {
    output = fs.readFileSync(path, "utf8").replace("\n", "");
  } catch (e) {
    console.error(e);
    output = "";
  }
  callback(output);
}

function log(text) {
  const timestamp = new Date().toISOString().replace(/-/g, "").replace(/:/g, "").replace("T", "-").split(".")[0];
  console.log(timestamp + "..." + text);
}

function testConnection(host, port, connectTimeout, callback) {
  const socket = new net.Socket();

  const output = {
    success: false,
    error: null,
  };

  socket.connect(port, host);
  socket.setTimeout(connectTimeout);

  socket.on("connect", function () {
    socket.destroy();
    output.success = true;
    return callback(null, output);
  });

  socket.on("error", function (err) {
    socket.destroy();
    output.error = err && err.message || err;
    return callback(err, output);
  });

  socket.on("timeout", function (err) {
    socket.destroy();
    output.error = err && err.message || err || "socket TIMEOUT";
    return callback(err, output);
  });
}