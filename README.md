# fritzbox-reboot
The script checks if a target is reachable and restarts the fritzbox if it is not.

In addition, the script checks the uptime of the Fritzbox, if it is less than 10min, it is not restarted.

The password of the Fritzbox is read from a file, if none is given.

## install
    npm install connection-tester
    npm install tr-064

## call
    */3 * * * * /usr/bin/node /home/xxx/fritzbox-reboot/fritzbox-reboot.js >> /path/to//logfile/firtzbox-reboot.log