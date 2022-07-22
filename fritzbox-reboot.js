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

const fritzConfig = {
  user: "fritz8946",
  passwd: "",
  passwdPath: homedir + "/fritzboxPasswd",
  ipAdress: "192.168.178.1",
  minUptime: 600, // seconds
  tr064Port: 49000,
  tr064ServiceReboot: "urn:DeviceConfig-com:serviceId:DeviceConfig1",
  tr064ServiceUptime: "urn:DeviceInfo-com:serviceId:DeviceInfo1",
};

const testConfig = {
  dontTest: false, // If true the FB will allways rebooted.
  target: "8.8.8.8",
  port: 443,
  timeout: 3000,
};

let fritzbox;

run();
async function run() {
  if (!fritzConfig.passwd) {
    // read password from file
    if (!fritzConfig.passwdPath) {
      log("path invalid");
      return;
    }
    readFile(fritzConfig.passwdPath, (ret) => {
      fritzConfig.passwd = ret;
    });
  }
  if (!fritzConfig.passwd) {
    log("password invalid");
    return;
  }

  fritzbox = new Fritzbox({ username: fritzConfig.user, password: fritzConfig.passwd, });

  if (testConfig.dontTest) {
    reboot();
    return;
  }

  testConnection(
    testConfig.target,
    testConfig.port,
    testConfig.timeout,
    (err, output) => {
      if (!output.success) {
        // no internet connection. reboot required
        getUptime(uptime => {
          log("uptime=" + uptime);
          if (uptime === 0) {
            log("uptime invalid. no reboot.");
            return;
          }
          if (uptime > fritzConfig.minUptime) {
            reboot();
            return;
          }
          log(`last reboot less then ${fritzConfig.minUptime} seconds ago (${uptime} seconds)`);
        });
      } else {
        if (debug) {
          log("internet connection available");
        }
      }
    }
  );
}

// reboot the FritzBox
async function reboot() {
  try {
    log("Reboot started.");

    if (debug) return;

    await fritzbox.exec(
      fritzConfig.tr064ServiceReboot,
      "Reboot",
    );

  } catch (err) {
    console.error(err);
  }
}

// get FritzBox uptime
async function getUptime(callback) {
  try {
    const info = await fritzbox.exec(
      fritzConfig.tr064ServiceUptime,
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

// read file
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

// write log to stdout
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