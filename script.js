////////////
// FIELDS //
////////////

let sbDebugMode = true;
let googleFont = "Open Sans";
let customFont = "";

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const sbServerPort = urlParams.get("port") || 8082;
const sbServerAddress = urlParams.get("server") || "127.0.0.1";

/////////////////
// GLOBAL VARS //
/////////////////

let ws;

///////////////////////////////////
// SRTEAMER.BOT WEBSOCKET SERVER //
///////////////////////////////////

// This is the main function that connects to the Streamer.bot websocke server
function connectws() {
	if ("WebSocket" in window) {
		ws = new WebSocket("ws://" + sbServerAddress + ":" + sbServerPort + "/");

		// Reconnect
		ws.onclose = function () {
			SetConnectionStatus(false);
			setTimeout(connectws, 5000);
		};

		// Connect
		ws.onopen = async function () {
			SetConnectionStatus(true);
			LoadFont();

			console.log("Subscribe to events");
			ws.send(
				JSON.stringify({
					request: "Subscribe",
					id: "subscribe-events-id",
					// This is the list of Streamer.bot websocket events to subscribe to
					// See full list of events here:
					// https://docs.streamer.bot/api/servers/websocket/requests
					events: {
						twitch: [
							"StreamUpdate"
						],
						youTube: [
							"BroadcastStarted",
							"BroadcastEnded",
							"BroadcastUpdated"
						],
						general: [
							"Custom"
						]
					}
				})
			);

			sbFetchBroadcasts(ws);

			ws.onmessage = function (event) {
				// Grab message and parse JSON
				const msg = event.data;
				const wsdata = JSON.parse(msg);

				if (typeof wsdata.event == "undefined") {
					return;
				}

				// Print data to log for debugging purposes
				if (sbDebugMode) {
					console.log(wsdata.data);
					console.log(wsdata.event.source);
					console.log(wsdata.event.type);
				}

				// Check for events to trigger
				// See documentation for all events here:
				// https://wiki.streamer.bot/en/Servers-Clients/WebSocket-Server/Events
				switch (wsdata.event.source) {
					// Twitch Events
					case 'Twitch':
						switch (wsdata.event.type) {
							case ('StreamUpdate'):
								sbFetchBroadcasts(ws);
								break;
						}
					// Twitch Events
					case 'YouTube':
						switch (wsdata.event.type) {
							case ('BroadcastStarted'):
							case ('BroadcastEnded'):
							case ('BroadcastUpdated'):
								sbFetchBroadcasts(ws);
								break;
						}
					// General Events
					case 'General':
						switch (wsdata.event.type) {
							case ('Custom'):
								switch (wsdata.data.action) {
									case ('[NUT] Multistream Title Updater | Fetch Broadcasts'):
										UpdateBroadcastList(wsdata.data);
										break;
								}
								break;
						}
						break;

				}
			};
		}
	}
}



/////////////////////////
// STREAMER.BOT WIDGET //
/////////////////////////

function sbFetchBroadcasts(ws) {

	let request = JSON.stringify({
		request: "DoAction",
		id: generateUUID(),
		action: {
			name: "[NUT] Multistream Title Updater | Fetch Broadcasts"
		}
	});

	ws.send(request);
}

function sbUpdateTitles(ws, title) {
	let request = JSON.stringify({
		request: "DoAction",
		id: generateUUID(),
		action: {
			name: "[NUT] Multistream Title Updater | Update All Broadcasts"
		},
		args: {
			title: title
		}

	});

	ws.send(request);
}

function sbUpdateTwitchTitle(ws, title) {
	let request = JSON.stringify({
		request: "DoAction",
		id: generateUUID(),
		action: {
			name: "[NUT] Multistream Title Updater | Update Twitch Title"
		},
		args: {
			title: title
		}

	});

	ws.send(request);
}

function sbUpdateYouTubeTitle(ws, title, broadcastId) {
	let request = JSON.stringify({
		request: "DoAction",
		id: generateUUID(),
		action: {
			name: "[NUT] Multistream Title Updater | Update YouTube Title"
		},
		args: {
			broadcastId: broadcastId,
			title: title
		}

	});

	ws.send(request);
}


//////////////////////
// HELPER FUNCTIONS //
//////////////////////

function LoadFont() {
	document.body.style.fontFamily = IsNullOrWhitespace(customFont) ? googleFont : customFont;
}

function generateUUID() { // Public Domain/MIT
	var d = new Date().getTime();//Timestamp
	var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = Math.random() * 16;//random number between 0 and 16
		if (d > 0) {//Use timestamp until depleted
			r = (d + r) % 16 | 0;
			d = Math.floor(d / 16);
		} else {//Use microseconds since page-load if supported
			r = (d2 + r) % 16 | 0;
			d2 = Math.floor(d2 / 16);
		}
		return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
	});
}

function IsNullOrWhitespace(str) {
	return /^\s*$/.test(str);
}



///////////////////////////////////
// STREAMER.BOT WEBSOCKET STATUS //
///////////////////////////////////

// This function sets the visibility of the Streamer.bot status label on the overlay
function SetConnectionStatus(connected) {
	let connectionStatusIcon = document.getElementById("connectionStatusIcon");
	let ThisIsWhereAllTheCoolStuffHappens = document.getElementById("ThisIsWhereAllTheCoolStuffHappens");
	let infoIcon = document.getElementById("infoIcon");

	if (connected) {
		connectionStatusIcon.src = "connected.svg";
		ThisIsWhereAllTheCoolStuffHappens.classList.remove('disabled');
		infoIcon.style.display = 'none';
	}
	else {
		connectionStatusIcon.src = "disconnected.svg";
		ThisIsWhereAllTheCoolStuffHappens.classList.add('disabled');
		infoIcon.style.display = 'inline';

		// (1) Clear list of broadcasts
		const fieldsContainer = document.getElementById('fieldsContainer');
		fieldsContainer.innerHTML = "";
	}
}

// This function sets the visibility of the Streamer.bot status label on the overlay
function RefreshAnimation() {
	let refreshContainer = document.getElementById("refreshContainer");
	refreshContainer.style.opacity = 1;
	var tl = new TimelineMax();
	tl
		.to(refreshContainer, 2, { opacity: 0, ease: Linear.easeNone })
}



// Button handling for UPDATE ALL button only
const infoIcon = document.querySelector("#infoIcon");
infoIcon.addEventListener("click", function () {
	window.open("https://www.notion.so/nutty-s-multistream-title-updater-e2fb7b24c7514f9cbd943729f54be1d9");
});

// Button handling for UPDATE ALL button only
const submitButton = document.querySelector("#submitButton");
submitButton.addEventListener("click", function () {
	const titleInput = document.querySelector("#titleInput").value;
	sbUpdateTitles(ws, titleInput);
});

// Button handling for REFRESH button only
const refreshButton = document.querySelector("#refreshButton");
refreshButton.addEventListener("click", function () {
	sbFetchBroadcasts(ws);
});


function UpdateBroadcastList(data) {
	// Iterate through broadcast list
	//	Find div whose ID matches the broadcast
	//		If it exists, update the title
	//		else, it's a new broadcast, so add it to the list
	const fieldsContainer = document.getElementById('fieldsContainer');
	for (const broadcast of data.broadcastList) {
		const broadcastDiv = fieldsContainer.querySelector(`#${broadcast.id}`);

		if (broadcastDiv == null)
			AddBroadcast(broadcast);
		else
			UpdateBroadcast(broadcastDiv, broadcast);
	}

	// Check if any broadcasts have gone offline
	// 		If so, delete them from the list
	var parentDiv = document.getElementById('fieldsContainer');
	const childDivs = parentDiv.querySelectorAll("div");
	childDivs.forEach(childDiv => {
		var result = data.broadcastList.find(obj => {
			return obj.id === childDiv.id
		})
		if (result == null)
			childDiv.innerHTML = "";
	});

	//// THIS CODE ALSO WORKS AND IS WAY SIMPLER, I JUST MADE THINGS
	//// 10 TIMES HARDER FOR MYSELF BECAUSE I LOVE PAIN POGGERS
	// // (1) Clear list of broadcasts
	// const fieldsContainer = document.getElementById('fieldsContainer');
	// fieldsContainer.innerHTML = "";

	// // (2) For each broadcast in list, create new entry
	// for (const broadcast of data.broadcastList)
	// {
	// 	AddBroadcast(broadcast);
	// }

	RefreshAnimation();
}

function AddBroadcast(broadcast) {
	// Get a reference to the template
	const template = document.getElementById('platformTemplate');

	// Create a new instance of the template
	const instance = template.content.cloneNode(true);

	// Assign ID to instance
	const broadcastBox = instance.querySelector('.broadcastBox');
	broadcastBox.id = broadcast.id;

	// Modify the content of the template instance
	const titleElement = instance.querySelector('.platformTitle');
	titleElement.value = broadcast.title;

	// Modify the content of the template instance
	const buttonElement = instance.querySelector('.platformSubmitButton');
	buttonElement.classList.add(broadcast.platform);

	// Modify the icon of the template instance
	const iconElement = instance.querySelector('#icon');

	// Add button handling (need separate handling for Twitch/YouTube)
	switch (broadcast.platform) {
		case 'twitch':
			iconElement.src = 'twitch.png';

			buttonElement.addEventListener("click", function () {
				sbUpdateTwitchTitle(ws, titleElement.value);
			});
			break;
		case 'youtube':
			// Modify the icon of the template instance
			iconElement.src = 'youtube.png';

			buttonElement.addEventListener("click", function () {
				const youtubeID = broadcast.id.replace('youtube-', '');
				sbUpdateYouTubeTitle(ws, titleElement.value, youtubeID);
			});
			break;
	}

	// Add click event
	const iconButton = instance.querySelector('#platformIconButton');
	iconButton.addEventListener("click", function () {
		window.open(broadcast.url);
	});

	// Insert the modified template instance into the DOM
	const fieldsContainer = document.getElementById('fieldsContainer');
	fieldsContainer.appendChild(instance);
}

function UpdateBroadcast(div, broadcast) {
	// Modify the content of the template instance
	const titleElement = div.querySelector('.platformTitle');
	titleElement.value = broadcast.title;
}

connectws();
