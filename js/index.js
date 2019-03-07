// 2018.12.17

var app = {

    // Automation-IO service and digital characteristic 
    automation_io: { service:"1815", digital:"2A56" },

    local_debug: true,
    mobile_debug: false,
    log_data: [],
    log_data_len: 0,
    log_str: "",
    //-----------------------------------------------------------------
    consDebug: function (data) {
        if (app.local_debug) {
            console.log(data);
        }
        if (app.mobile_debug) {
            debug.hidden = false;
            app.log_data.push(data);
            if (++app.log_data_len > 8) {
                app.log_data.shift();
                app.log_data_len = 8;
            }
            app.log_str = "";
            for (i in app.log_data) {
                app.log_str += app.log_data[i] + '\r';
            }
            document.getElementById('debug_msg').innerHTML = app.log_str;
        } else {
            debug.hidden = true;
        }
    },

    //-----------------------------------------------------------------
    str2ab: function (str) {
        var buf = new ArrayBuffer(str.length); // 1 bytes for each char
        var bufView = new Uint8Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    },

    //-----------------------------------------------------------------
    ab2hexstr: function (bytes) {
        var str = "";
        var strByte = "";
        for (var i = 0; i < bytes.length; i++) {
            var byte = bytes[i];
            strByte = byte.toString(16);
            if (strByte.length == 1) {
                strByte = "0" + strByte;
            }
            strByte = strByte + " ";
            str = str + strByte;
        }
        return str.toUpperCase();
    },

    //-----------------------------------------------------------------
    ab2str: function (uint8array) {
        var str = "";
        for (var i = 0; i < uint8array.byteLength; i++) {
            str += String.fromCharCode(uint8array[i])
        }
        return str;
    },

    // ASCII only
    stringToBytes: function (string) {
        var array = new Uint8Array(string.length);
        for (var i = 0, l = string.length; i < l; i++) {
            array[i] = string.charCodeAt(i);
        }
    return array.buffer;
    },

    // ASCII only
    bytesToString: function (buffer) {
        return String.fromCharCode.apply(null, new Uint8Array(buffer));
    },

    //-----------------------------------------------------------------
    Start: function() {
        document.addEventListener('deviceready', app.Entry.bind(this), false);
        document.addEventListener('online', app.OnLine, false);
        document.addEventListener('offline', app.OffLine, false);
        document.addEventListener('backbutton', app.BackButton, false);
        document.addEventListener("resign", app.IOSresign, false);
        document.addEventListener("pause", app.Pause, false);
        document.addEventListener("resume", app.Resume, false);
        
        to_info.addEventListener('touchstart', app.Info, false);
        to_scan.addEventListener('touchstart', app.Scan, false);
        back_scan.addEventListener('touchstart', app.Home, false);
        devices_list.addEventListener('touchstart', app.TappedDevice, false);
        back_connect.addEventListener('touchstart', app.DeviceDisconnect, false);
        connect_change.addEventListener('touchstart', app.ChangeState, false);
        connect_set.addEventListener('touchstart', app.SetDescription, false);
        back_info.addEventListener('touchstart', app.Home, false);
        alert_modal_ok.addEventListener('touchstart', app.AlertModalOK, false);
    },

    online: false,
    //-----------------------------------------------------------------
    OnLine: function () {
        console.log('OnLine()');
        online = true;
    },

    //-----------------------------------------------------------------
    OffLine: function () {
        console.log('OffLine()');
        online = false;
    },

    //-----------------------------------------------------------------
    BackButton: function () {
        console.log('BackButton()');
    },

    running: true,
    //-----------------------------------------------------------------
    IOSresign: function () {
        console.log('IOSresign()');
        running = false;
    },

    //-----------------------------------------------------------------
    Pause: function () {
        console.log('Pause()');
        running = false;
    },

    //-----------------------------------------------------------------
    Resume: function () {
        console.log('Resume()');
        running = true;
    },


    width: 0,
    height: 0,
    //-----------------------------------------------------------------
    Entry: function () {
        console.log('Entry()');

        home.hidden = false;
        scan.hidden = true;
        connect.hidden = true;
        info.hidden = true;
        alert_modal.style.display = 'none'; 
        if (app.mobile_debug == true) {
            debug.hidden = false;
        } else {
            debug.hidden = true;
        }

        setTimeout(app.BLE_Alert, 500);

        app.width = screen.width;
        app.height = screen.height;
        console.log("width=" + app.width + " height=" + app.height);
    },


    //-----------------------------------------------------------------
    BLE_Alert: function () {
        console.log('BLE_Alert()');
      
        // alert_title.innerHTML = "ATTENTION";
        // alert_title.style.background = "darkorange";
        // alert_title.style.color = "white";
        // alert_message.innerHTML = "Bluetooth and Position Info must be enabled to use this BLE mobile application";
        // alert_modal.style.display = 'block';
        alert("Bluetooth and the Position Info must be both enabled to use this BLE mobile application");
        
        ble.enable(
            function() {
                console.log("Bluetooth is enabled");
            },
            function() {
                console.log("The user did *not* enable Bluetooth");
            }
        );

        app.Home();
    },

    //-----------------------------------------------------------------
    BLE_Error: function (err) {
        var strErr = 'BLE_Error: ' + JSON.stringify(err);
        console.log(strErr);
        alert(strErr);
        app.Home();
    },

    //-----------------------------------------------------------------
    Home: function() {
        console.log('Home()');
        
        // try to disconnect a connected BLE Device
        if (app.bleDeviceConnected_ID != "") {
            ble.isConnected(
                app.bleDeviceConnected_ID,
                function() {
                    console.log("Peripheral is connected");
                    ble.disconnect(app.bleDeviceConnected_ID, null, null);
                },
                function() {
                    console.log("Peripheral is *not* connected");
                }
            );
        }
        app.bleDeviceConnected = {}; 
        app.bleDeviceConnected_ID = "";

        home.hidden = false;
        scan.hidden = true;
        connect.hidden = true;
        info.hidden = true;
     },

    bleDevicesScanned: [],
    index_bleDevicesScanned: 0,
    devicesList: null,
    htmlText: "",
    //-----------------------------------------------------------------
    Scan: function () {
        scan.hidden = false;
        home.hidden = true;
        connect.hidden = true;

        console.log('Scan()');
        scan_msg.innerHTML = "Back to restart a new BLE Scan<br />or Tap the BLE Device to Connect it"; 
        app.bleDevicesScanned = []; // flush 'bleDevicesScanned'
        devices_list.innerHTML = ''; // flush 'devices_list' 
        app.index_bleDevicesScanned = 0;
        app.bleDeviceConnected_ID = "";

        ble.startScan (
            ["1815"], // Automation-IO Service
            function (res) {
                console.log(JSON.stringify(res));
                app.bleDevicesScanned.push(res); // save BLE device obj

                // get description from localStorage
                var description = localStorage.getItem(res.id);
                console.log("localStorage.getItem(" + res.id + "): " + description);
                if (description == null) {
                  description = "--------";
                  localStorage.setItem(res.id, description);
                }
                // display BLE device obj data into 'devices_list' 
                app.htmlText = '<b>' + description + '</b><br/>' +
                                '<b>' + res.name + '</b><br/>' +
                                'RSSI: ' + res.rssi + 'dBm<br/>' +
                                '[' + res.id + ']';

                // save BLE device obj data into '.dataset' 
                app.devicesList = document.createElement('li');
                app.devicesList.dataset.id = res.id;
                app.devicesList.dataset.name = res.name;
                app.devicesList.dataset.index = app.index_bleDevicesScanned;
                ++app.index_bleDevicesScanned;
                app.devicesList.innerHTML = app.htmlText;
                
                // update the displayed 'devices_list'
                var htmlList = document.getElementById("devices_list");
                htmlList.appendChild(app.devicesList);               
            },
            app.BLE_Error
        );
    },

 
    //-----------------------------------------------------------------
    TappedDevice: function(device) {
        console.log("TappedDevice()");

        // Stop Scan and then Connect
        ble.stopScan(null, null);
        
        var id = device.target.dataset.id;
        console.log(id);
        if (id == null) {
          //scan_msg.innerHTML = 'Back to restart a new BLE Scan<br />or Tap the BLE Device to Connect it';
        } else { 
          app.bleDeviceConnected = device;
          app.Connect();
        }
    },
    
    bleDeviceConnected: {},
    bleDeviceConnected_ID: "",
    deviceState: null,
    //-----------------------------------------------------------------
    Connect: function () {
        console.log('Connect()');
        alert("Connection to Device and then Reading the Current State may require some seconds ...\nPlease wait to see the Current State before Change it.");
        
        ble.connect(app.bleDeviceConnected.target.dataset.id, app.DeviceConnected, app.BLE_Error);
    },

    //-----------------------------------------------------------------
    DeviceConnected: function (res) {
        console.log("DeviceConnected()\n" + JSON.stringify(res));

        checkbox_on.checked = false;
        checkbox_off.checked = false;
        connect.hidden = false;
        scan.hidden = true;
          
        connect_msg.innerHTML = '<b>' + app.bleDeviceConnected.target.dataset.name + '</b><br />' +
                                app.bleDeviceConnected.target.dataset.id;

        // save the ID of BLE connected device
        app.bleDeviceConnected_ID = res.id;
        // read STATUS
        ble.read(
            app.bleDeviceConnected_ID, 
            app.automation_io.service, 
            app.automation_io.digital, 
            function (res) {
              var v0 = new DataView(res);
              var d = v0.getUint16(0, true); // get littleEndian
              var s = d.toString(16).toUpperCase();
              console.log(s);
              app.deviceState = 1;
              if (d == 0xFFFC) 
                app.deviceState = 0;
              console.log(app.deviceState);
              if (app.deviceState == 1) {
                checkbox_on.checked = true;
                checkbox_off.checked = false;
              } else {
                checkbox_on.checked = false;
                checkbox_off.checked = true;
              }
            },
            app.BLE_Error
            );
        // display DESCRIPTION
        var description = localStorage.getItem(app.bleDeviceConnected_ID);
        console.log("localStorage.getItem(" + app.bleDeviceConnected_ID + "): " + description);
        document.getElementById("description_str").value = description;      
    },

    //-----------------------------------------------------------------
    ChangeState: function () {
        console.log("ChangeState()");

        // update STATE display
        app.deviceState ^= 1;
        if (app.deviceState == 1) {
          checkbox_on.checked = true;
          checkbox_off.checked = false;
        } else {
          checkbox_on.checked = false;
          checkbox_off.checked = true;
        }
        
        var valOff = new Uint8Array(2);
        valOff[1] = 0xFF;
        valOff[0] = 0xF3;
        ble.write(
            app.bleDeviceConnected_ID, 
            app.automation_io.service, 
            app.automation_io.digital,
            valOff.buffer,  
            function (res) {
              setTimeout(
                function () {
                  var valOn = new Uint8Array(2);
                  valOn[1] = 0xFF;
                  valOn[0] = 0xF7;
                  ble.write(
                      app.bleDeviceConnected_ID, 
                      app.automation_io.service, 
                      app.automation_io.digital,
                      valOn.buffer,  
                      null,
                      null
                      );
                },
                500);
            },
            app.BLE_Error
          );
        
    },
    
    
    //-----------------------------------------------------------------
    SetDescription: function () {
        console.log("SetDescription()");

        var description = document.getElementById("description_str").value;
        localStorage.setItem(app.bleDeviceConnected_ID, description);
        console.log("localStorage.setItem(" + app.bleDeviceConnected_ID + "," + description + ")");
        console.log("localStorage.getItem(" + app.bleDeviceConnected_ID + "): " + localStorage.getItem(app.bleDeviceConnected_ID));
    },
    
    //-----------------------------------------------------------------
    DeviceDisconnect: function () {
        console.log("DeviceDisconnect()");
        if (app.bleDeviceConnected_ID != "") {
            // if device connectect then disconnect it
            ble.disconnect(app.bleDeviceConnected_ID, app.BackHome, app.Home);
        }
    },

    //-----------------------------------------------------------------
    BackHome: function () {
        console.log("BackHome()");
        app.bleDeviceConnected = {}; 
        app.bleDeviceConnected_ID = "";

        app.Home();
    },

    
    //infoText: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    infoText: "SELFIE smart alarm is a stand-alone, PIR motion detection sensor, that can be easily wall mounted and allows the user to receive alerts when triggered through the SIGFOX network.\n\nThe device is battery operated with a operation lifespan of 2-3 years before changing the battery (depending on the number of alarms sent to the SIGFOX network).\n\nThere is no need of any professional installer or electrical cabling:\nSELFIE devices can be wall mounted with its plaque and rotated to the preferred direction to control the room.\n\nThe SELFIE smart alarm is SIGFOX certified; it is also CE branded and compliant with electromagnetic EU directives. It will not interfere with your other home appliances.",
    //-----------------------------------------------------------------
    Info: function () {
        info.hidden = false;
        home.hidden = true;

        console.log('Info()');
        var e = document.getElementById("info_msg");
        var h = app.height - 180;
        e.setAttribute("style", ("width: 100%;height:"+h+"px;"));
        e.innerHTML = app.infoText;
    },

    //-----------------------------------------------------------------
    AlertModalOK: function () {
        console.log('AlertModalOK()');
        alert_modal.style.display = 'none';
    },  
    
    //-----------------------------------------------------------------
    Debug: function () {
        if (app.mobile_debug == true) {
            app.mobile_debug = false;
            debug.hidden = true;
        } else {
            app.mobile_debug = true;
            debug.hidden = false;
        }
        console.log('Debug()');
    }

};

app.Start();