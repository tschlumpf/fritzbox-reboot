# fritzbox-reboot
The script checks if a target is reachable and restarts the fritzbox (in my case: FRITZ!Box 6890 LTE) if it is not.

In addition, the script checks the uptime of the Fritzbox, if it is less than 10min, it is not restarted.

The password of the Fritzbox is read from a file, if none is given.

## install
Requires at least node.js version 15.

    npm install

## configuration
```javascript
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
```

## call
    */3 * * * * /usr/bin/node /home/xxx/fritzbox-reboot/fritzbox-reboot.js >> /path/to/logfile/firtzbox-reboot.log

## further informations
* https://avm.de/service/schnittstellen/
* https://avm.de/fileadmin/user_upload/Global/Service/Schnittstellen/deviceinfoSCPD.pdf
* https://avm.de/fileadmin/user_upload/Global/Service/Schnittstellen/deviceconfigSCPD.pdf
