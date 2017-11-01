"use strict";

//Helper functions

function openFile(url, timeout, callback) {
    var args = Array.prototype.slice.call(arguments, 3);
    var xhr = new XMLHttpRequest();
    xhr.ontimeout = function () {
        console.error("The request for " + url + " timed out.");
    };
    xhr.onload = () => {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
				console.log("openFile("+url+"): OK");
                callback(xhr, args);
            } else {
				console.log("openFile("+url+"): "+xhr.statusText);
            }
        }
    };
    xhr.open("GET", url, true);
    xhr.timeout = timeout;
    xhr.send(null);
}

function svgSetColor(elem, color) {
	elem.childNodes.forEach((item)=>{
		console.log(item);
		console.log(item.tagName);
		if (item.tagName=="g") {
			console.log("group (recursive...)");
			svgSetColor(item, color);
		} else if (item.tagName=="path") {
			console.log(item.childNodes);
			item.setAttribute("style", "fill: "+color+";stroke: none;fill-opacity: 1;");
		} else {
			console.log("unknown ("+item.tagName+") element");
		}
	})
}

function idSetColor(id, color) {
	svgSetColor(document.getElementById(id), color);
}

function setPinColor(pin, color) {
	idSetColor("pin-"+pin, color);
}

function boardReplaceImage(xhr) {
	console.log("boardSvgCb");
	var elem = document.getElementById("deviceSvgContainer");
	elem.innerHTML = "";
	elem.appendChild(xhr.responseXML.documentElement);
}

// (2) board configuration

function updatePinFunction(pin) {
	var form = document.getElementById("boardConfig");
	var state = form.elements['pin-'+pin].value;
	
	var color = '';
	switch (state) {
		case 'di':
			color = "#00FF00";
			break;
		case 'do':
			color = "#FF0000";
			break;
		case 'ai':
			color = "#FFFF00";
			break;
		case 'ao':
			color = "#00FFFF";
			break;
		default:
			color = "#EEEEEE";
	}
	setPinColor(pin, color);
}

var boardInfo = null;

function boardReplace(xhr) {
	boardInfo = JSON.parse(xhr.responseText);
	console.log("boardReplace");
	var main = document.getElementById("content");
	var networkSettings = "<tr><td>MAC address</td><td colspan=2>";
	networkSettings += "<input type='text' size='2' name='mac1' value='00'/>";
	networkSettings += "<input type='text' size='2' name='mac2' value='00'/>";
	networkSettings += "<input type='text' size='2' name='mac3' value='00'/>";
	networkSettings += "<input type='text' size='2' name='mac4' value='00'/>";
	networkSettings += "<input type='text' size='2' name='mac5' value='00'/>";
	networkSettings += "<input type='text' size='2' name='mac6' value='00'/>";
	networkSettings += "</td></tr>";

	networkSettings += "<tr><td>IP configuration method</td><td>&nbsp;</td><td>&nbsp;</td></tr>";
	networkSettings += "<tr><td>&nbsp;</td><td><input type='radio' name='ipMethod' value='dhcp'/></td><td>DHCP</td></tr>";
	networkSettings += "<tr><td>&nbsp;</td><td><input type='radio' name='ipMethod' value='static'/></td><td>Static</td></tr>";
	
	networkSettings += "<tr><td>IP address</td><td colspan=2>";
	networkSettings += "<input type='text' size='2' name='ip1' value='192'/>";
	networkSettings += "<input type='text' size='2' name='ip2' value='168'/>";
	networkSettings += "<input type='text' size='2' name='ip3' value='1'/>";
	networkSettings += "<input type='text' size='2' name='ip4' value='1'/>";
	networkSettings += "</td></tr>";

	networkSettings += "<tr><td>Subnetmask</td><td colspan=2>";
	networkSettings += "<input type='text' size='2' name='sn1' value='192'/>";
	networkSettings += "<input type='text' size='2' name='sn2' value='168'/>";
	networkSettings += "<input type='text' size='2' name='sn3' value='1'/>";
	networkSettings += "<input type='text' size='2' name='sn4' value='1'/>";
	networkSettings += "</td></tr>";
	
	networkSettings += "<tr><td>Gateway</td><td colspan=2>";
	networkSettings += "<input type='text' size='2' name='gw1' value='192'/>";
	networkSettings += "<input type='text' size='2' name='gw2' value='168'/>";
	networkSettings += "<input type='text' size='2' name='gw3' value='1'/>";
	networkSettings += "<input type='text' size='2' name='gw4' value='1'/>";
	networkSettings += "</td></tr>";
	
	var ioSettings = "<table>";
	ioSettings += "<tr><td>Pin</td><td>Name</td><td>Mode</td></tr>";
	for (var i = 0; i < 14; i++) {
		var canPwm = false;
		if (i == 3) canPwm = true;
		if (i == 5) canPwm = true;
		if (i == 6) canPwm = true;
		if (i == 9) canPwm = true;
		if (i == 10) canPwm = true;
		if (i == 11) canPwm = true;
		setPinColor(i, "#00FF00");
		ioSettings += "<tr><td>"+i+"</td><td><input type='text' size='8' name='pin-"+i+"-name' value='pin"+i+"'/></td><td><select name='pin-"+i+"' onclick='updatePinFunction(\""+i+"\");'>";
		ioSettings += "<option value='di' selected>Digital input</option>";
		ioSettings += "<option value='do' >Digital output</option>";
		ioSettings += "<option value='ai' disabled>Analog input</option>";
		ioSettings += "<option value='ao'";
		if (!canPwm) ioSettings += " disabled";
		ioSettings += ">Analog output</option>";
		ioSettings += "</select></td></tr>";
	}
	for (var i = 0; i < 6; i++) {
		setPinColor("a"+i, "#00FF00");
		ioSettings += "<tr><td>A"+i+"</td><td><input type='text' size='8' name='pin-a"+i+"-name' value='pin A"+i+"'/></td><td><select name='pin-a"+i+"' onclick='updatePinFunction(\"a"+i+"\");'>";
		ioSettings += "<option value='di' selected>Digital input</option>";
		ioSettings += "<option value='do'>Digital output</option>";
		ioSettings += "<option value='ai'>Analog input</option>";
		ioSettings += "<option value='ao' disabled>Analog output</option>";
		ioSettings += "</select></td></tr>";
	}
	ioSettings += "</table>";

	var form = "<h2>Configure your board</h2><hr /><form id='boardConfig'>";
	//form += "<h3>Network</h3><table>"+networkSettings+"</table><hr />";
	
	form += "<h3>I/O</h3>"+ioSettings;
	
	form += "</form>";
	
	main.innerHTML = form;
}

function loadBoard(board) {
	openFile("boards/"+board+"/board.json", 1000, boardReplace);
	//openFile("boards/"+board+"/board.svg", 1000,boardReplaceImage);
}

// (1) board selection

function boardSelect() {
	var main = document.getElementById("content");
	var boardOptions = "<tr><td class='select'><input type='radio' name='board' onclick='boardSelectPreview()' value='uno'></td><td>Arduino Uno</td></tr>";
	boardOptions += "<tr><td><input type='radio' name='board' onclick='boardSelectPreview()' value='leonardo'></td><td>Arduino Leonardo</td></tr>";
	main.innerHTML = "<h2>1. Select a board</h2><hr /><form id='boardSelect'><table>"+boardOptions+"</table><hr /><div class='floatRight'><button name='continue' type='button' onclick='boardSelectSubmit()' disabled='true'>Continue</button></div></form>";
}

function boardSelectSubmit() {
	var form = document.getElementById("boardSelect");
	var board = form.elements['board'].value;
	loadBoard(board);
}

function boardSelectPreview() {
	var form = document.getElementById("boardSelect");
	var board = form.elements['board'].value;
	form.elements['continue'].disabled = false;
	openFile("boards/"+board+"/board.svg", 1000,boardReplaceImage);
}

boardSelect();
