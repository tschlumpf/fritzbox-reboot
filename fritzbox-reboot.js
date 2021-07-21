/*jshint
esversion: 8
*/
const debug = false;

const connectionTester = require("connection-tester");
const tr = require("tr-064");
const tr064 = new tr.TR064();
const fs = require('fs');

const fritzConfig = {
    user: "root",
    passwd: "",
    passwdPath: "/home/simon/scripts/fritzboxPasswd",
    ipAdress: "192.168.178.1",
    minUptime: 600, // seconds
    tr064Port: 49000,
    tr064ServiceReboot: "urn:dslforum-org:service:DeviceConfig:1",
    tr064ServiceUptime: "urn:dslforum-org:service:DeviceInfo:1"
};
const testConfig = {
    target: "google.com",
    port: 443,
    timeout: 3000
};

run();
async function run() {
    "use strict";
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

    connectionTester.test(
        testConfig.target,
        testConfig.port,
        testConfig.timeout,
        (err, output) => {
            if (!output.success) {
                // no internet connection. reboot required
                getUptime(fritzConfig.passwd, uptime => {
                    log("uptime=" + uptime);
                    if (uptime === 0) {
                        log("uptime invalid. no reboot.");
                        return;
                    }
                    if (uptime > fritzConfig.minUptime) {
                        reboot(fritzConfig.passwd, ret => {
                            log(ret);
                        });
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
function reboot(passwd, callback) {
    "use strict";
    tr064.initTR064Device(fritzConfig.ipAdress, fritzConfig.tr064Port, function (err, device) {
        if (!err) {
            device.startEncryptedCommunication(function (err, sslDev) {
                if (!err) {
                    sslDev.login(fritzConfig.user, passwd);
                    var deviceConfig = sslDev.services[fritzConfig.tr064ServiceReboot];
                    if (!debug) {
                        deviceConfig.actions.Reboot(function (err, result) {
                            // console.log(result);
                            // console.log(err);
                        });
                    }
                    callback("Fritzbox will be rebooted.");
                }
            });

        } else {
            callback("no internet connection and no Fritzbox reachable.");
        }
    });
}

async function getUptime(passwd, callback) {
    "use strict";
    tr064.initTR064Device(fritzConfig.ipAdress, fritzConfig.tr064Port, function (err, device) {
        if (!err) {
            device.startEncryptedCommunication(function (err, sslDev) {
                if (!err) {
                    sslDev.login(fritzConfig.user, passwd);
                    var deviceUptime = sslDev.services[fritzConfig.tr064ServiceUptime];
                    if (!deviceUptime) {
                        callback(0);
                        return;
                    }
                    deviceUptime.actions.GetInfo(function (err, result) {
                        if (!err) {
                            callback(result.NewUpTime);
                            return;
                        }
                        callback(0);
                    });
                    return;
                }
                callback(0);
            });
        } else {
            callback(0);
        }
    });
}

// read file
function readFile(path, callback) {
    "use strict";
    var output;

    try {
        output = fs.readFileSync(path, 'utf8').replace("\n", "");
    } catch (e) {
        console.error(e);
        output = "";
    }
    callback(output);
}

// write log to stdout
function log(text) {
    "use strict";
    console.log(new Date().toISOString() + "\t" + __filename + "\t" + text);
}