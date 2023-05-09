// GLOBALS YAY
var streamerIsSpeaking = false;
var waitingAMoment = false;
var waitingIntervalID = 0;
var streamerLastSpoke = 0;
var chatters = {};
var localChattersData = {};
var lastMessages = [];
var voices = {};
var voicesDesc = {};
var sortedLanguages = [];
var ssmlTextType = "text";
var bttvEmotes = [];
var ffzEmotes = [];
var twitch_id = 0;
var access_token = "";
var last_speaker = "system";
var last_speaker_time = Date.now();
var websocketCustom;
var websocketProd;
var hostname = location.hostname;
var autoconnect = "true";
var messageID = 1;
var currentSpeakingMessageID = 0;

const DEFAULT_COLORS = [
  "#b52d2d",
  "#5e5ef2",
  "#5cb55c",
  "#21aabf",
  "#FF7F50",
  "#9ACD32",
  "#FF4500",
  "#2E8B57",
  "#DAA520",
  "#D2691E",
  "#5F9EA0",
  "#1E90FF",
  "#FF69B4",
  "#8A2BE2",
  "#00FF7F",
];

const HashCode = (str) =>
  str.split("").reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0);

const GetColorForUsername = (userName) =>
  DEFAULT_COLORS[Math.abs(HashCode(userName)) % (DEFAULT_COLORS.length - 1)];

const defaultOutput = [{ label: "Default", deviceId: "default" }];

cred = {
  awsAccessKeyId: "",
  awsSecretAccessKey: "",
  sessionToken: "",
};

AWS.config.region = "us-west-2";

var hash = window.location.hash;
history.pushState(
  "",
  document.title,
  window.location.pathname + window.location.search
);
//window.location.hash = "";

function getHashParams() {
  var hashParams = {};
  var e,
    r = /([^&;=]+)=?([^&;]*)/g,
    q = hash.substring(1);
  while ((e = r.exec(q))) {
    hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}

function showAuthButton() {
  var redirectURL =
    "https://securitylive.com/tts/safetokenXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.html";

  if (hostname.includes("localhost")) {
    redirectURL =
      "http://localhost:8080/tts.bot/webfront/safetokenXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.html";
  } else if (hostname.includes("dev.tts.bot")) {
    redirectURL =
      "https://dev.tts.bot/safetokenXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.html";
  } else if (hostname.includes("tts.bot")) {
    redirectURL =
      "https://tts.bot/safetokenXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.html";
  }

  var twitchURL =
    '<a href="https://id.twitch.tv/oauth2/authorize?client_id=dan71ek0pct1u7b8ht5u4h55zlcxvq&redirect_uri=' +
    redirectURL +
    '&response_type=token&scope=chat:read+chat:edit" class="btn btn-primary" > Authorize On Twitch with minimal permissions</a >' +
    '<a href="https://id.twitch.tv/oauth2/authorize?client_id=dan71ek0pct1u7b8ht5u4h55zlcxvq&redirect_uri=' +
    redirectURL +
    '&response_type=token&scope=chat:read+chat:edit+moderator:manage:banned_users+moderator:manage:chat_messages" class="btn btn-primary" > Authorize On Twitch with ban and chat delete permissions</a >';

  $("#login").html(twitchURL);
  $("#login").show();
  $("#ttsinfo").show();
  $("#loggedin").hide();
  $("#ttsinfo").show();
}

function sanitizeChanName(channelName) {
  const sanitizedChannelName = channelName.replace(/[^a-zA-Z0-9-_]/g, "");
  return sanitizedChannelName;
}

var params = getHashParams();
const url = new URL(window.location.href);
access_token = params.access_token;

function toggleSettingsMenu() {
  var menu = document.getElementById("settingsMenu");
  var chatContainer = document.getElementById("chatContainer");
  if (menu.style.display === "none") {
    menu.style.display = "block";
    chatContainer.style.display = "none";
  } else {
    menu.style.display = "none";
    chatContainer.style.display = "";
  }
}

function toggleCCTPopup() {
  if (!window.cctPopup || window.cctPopup.closed) {
    window.cctPopup = window.open(
      document.getElementById("txtCCTURL").value,
      "Closed Captioning and Translation Popup",
      "width=800,height=600"
    );
  } else {
    window.cctPopup.focus();
  }
}

async function copyCCTPopupURL() {
  try {
    await navigator.clipboard.writeText(
      document.getElementById("txtCCTURL").value
    );
  } catch (err) {
    console.error("Failed to copy text:", err);
  }
}

async function sendEventToCCT(event) {
  if (window.cctPopup && !window.cctPopup.closed) {
    if (typeof window.cctPopup.processResults === "function") {
      window.cctPopup.processResults(event);
      //obj = JSON.parse(JSON.stringify(event));
      //await window.cctPopup.postMessage(
      //  JSON.stringify(event),
      //  "http://localhost:8080"
      //);
    } else {
      console.log(window.cctPopup.document.getElementById("text_result"));
      console.log("Custom function not found in the child window.");
    }
  } else {
    console.log("Child window is not open.");
  }
}

if (url.searchParams.has("autoconnect")) {
  autoconnect = url.searchParams.get("autoconnect");
}

if (access_token) {
  localStorage.setItem("access_token", access_token);
} else if (localStorage.getItem("access_token")) {
  access_token = localStorage.getItem("access_token");
}

$.ajax({
  url: "https://api.twitch.tv/helix/users",
  type: "GET",
  headers: {
    "client-id": "dan71ek0pct1u7b8ht5u4h55zlcxvq",
    Authorization: "Bearer " + access_token,
  },

  success: function (response) {
    var login = response.data[0].login;
    document.getElementById("twitch_username").value = login;
    var channel = login;

    if (localStorage.getItem("channel")) {
      let channel = localStorage.getItem("channel");
      console.log("beforeSan:", channel);
      channel = sanitizeChanName(channel);
      console.log("afterSan:", channel);
      document.getElementById("channel").value = channel;
    }
  },

  error: function (response) {
    localStorage.removeItem("access_token");
    access_token = null;
    showAuthButton();
  },
});

if (localStorage.getItem("twitch_username")) {
  document.getElementById("twitch_username").value =
    localStorage.getItem("twitch_username");
}

if (localStorage.getItem("twitch_channel")) {
  document.getElementById("channel").value =
    localStorage.getItem("twitch_channel");
}
if (localStorage.getItem("chatters")) {
  chatters = JSON.parse(localStorage.getItem("chatters"));
  //console.log(chatters);
}

if (localStorage.getItem("websocketURL")) {
  document.getElementById("txtWebsocketURL").value =
    localStorage.getItem("websocketURL");
  document.getElementById("cbSendTextToWebsocket").checked = true;
}
if (localStorage.getItem("AWSwebsocketURL")) {
  document.getElementById("txtAWSWebsocketURL").value =
    localStorage.getItem("AWSwebsocketURL");
  document.getElementById("cbSendTextToAWSWebsocket").checked = true;
}

(async () => {
  try {
    await loadOptions();
    await updatePreview();
  } catch (err) {
    console.error("Error calling async function:", err);
  }
})();

if (chatters == undefined) {
  chatters = {};
}

chatters["system"] = {};
chatters["system"].voice = "justin";
chatters["system"].voice_option = "neural";

async function loadFFZEmotes() {
  var request = new XMLHttpRequest();
  var set_id = 0;

  await $.ajax({
    url:
      "https://api.frankerfacez.com/v1/_room/" +
      document.getElementById("twitch_username").value,
    success: function (response) {
      //console.log("response:", response);
      twitch_id = response.room.twitch_id;
      set_id = response.room.set;
      console.log("set_id:", set_id);
      console.log("twitch_id:", twitch_id);
    },
    error: function (request, status, error) {
      console.log("loadFFZEmotes room error:", error);
    },
  });

  await $.ajax({
    url: "https://api.frankerfacez.com/v1/set/" + set_id,
    success: function (response) {
      for (const emote of response.set.emoticons) {
        ffzEmotes.push(emote.name);
      }
      for (const emote of ffzEmotes) {
      }
    },
    error: function (request, status, error) {
      console.log("loadFFZEmotes set error:", error);
    },
  });
}

// Hack job to get twitch_id from FFZ first, call this second, always.
async function loadBTTVEmotes() {
  var request = new XMLHttpRequest();
  request.open(
    "GET",
    "https://api.betterttv.net/3/cached/users/twitch/" + twitch_id,
    true
  );
  request.onreadystatechange = function () {
    if (request.readyState === 4 && request.status === 200) {
      var responseJSON = JSON.parse(request.responseText);
      for (const emote of responseJSON.channelEmotes) {
        bttvEmotes.push(emote.code);
      }
      for (const emote of responseJSON.sharedEmotes) {
        bttvEmotes.push(emote.code);
      }
    }
  };
  await request.send(null);
}

async function loadBTTVGlobalEmotes() {
  var request = new XMLHttpRequest();
  request.open("GET", "https://api.betterttv.net/3/cached/emotes/global", true);
  request.onreadystatechange = function () {
    if (request.readyState === 4 && request.status === 200) {
      var responseJSON = JSON.parse(request.responseText);
      for (const emote of responseJSON) {
        bttvEmotes.push(emote.code);
      }
    }
  };
  await request.send(null);
}

function rgba(color, opacity) {
  return `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(
    color.slice(3, 5),
    16
  )}, ${parseInt(color.slice(5, 7), 16)}, ${opacity})`;
}

function rgbaToHex(rgbaString) {
  if (!rgbaString) {
    return null;
  }

  const rgba = rgbaString.match(
    /^rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*(\d*\.?\d+)?\)$/i
  );
  if (!rgba) {
    return null;
  }

  const hex = (color) => {
    const hexColor = parseInt(color, 10).toString(16);
    return hexColor.length === 1 ? "0" + hexColor : hexColor;
  };

  const r = hex(rgba[1]);
  const g = hex(rgba[2]);
  const b = hex(rgba[3]);
  const a = rgba[4] ? parseFloat(rgba[4]) : 1;

  return `#${r}${g}${b}`;
}

function saveOption(element) {
  if (element.type === "checkbox") {
    localStorage.setItem(element.id, element.checked);
  } else if (
    element.type === "number" ||
    element.type === "text" ||
    element.type === "range"
  ) {
    localStorage.setItem(element.id, element.value);
  } else if (element.type === "color") {
    let ele = element.id.slice(2);
    ele = ele.charAt(0).toLowerCase() + ele.slice(1);
    let opacityRange = document.getElementById(ele + "Opacity");
    if (opacityRange) {
      localStorage.setItem(element.id, rgba(element.value, opacityRange.value));
    } else {
      localStorage.setItem(element.id, rgba(element.value, 1));
    }
  } else {
    console.log("Unknown element type:" + element.type);
  }
}

async function loadOptions() {
  const entries = Object.entries(localStorage);
  entries.forEach(([key, value]) => {
    if (key.startsWith("cb")) {
      document.getElementById(key).checked = JSON.parse(value);
    } else if (key.startsWith("txt")) {
      document.getElementById(key).value = value;
    } else {
      //console.log("key not found:", key);
      //let element = document.getElementById(key);
      //if (element) element.value = value;
    }
  });
  await getColorStyles();
}

async function getColorStyles() {
  const webkitTextStrokeColor = localStorage.getItem("cpWebkitTextStrokeColor");
  const borderColor = localStorage.getItem("cpBorderColor");
  const shadowColor = localStorage.getItem("cpShadowColor");
  const fontColor = localStorage.getItem("cpFontColor");
  const outlineColor = localStorage.getItem("cpOutlineColor");
  const bubbleBackgroundColor = localStorage.getItem("cpBubbleBackgroundColor");
  const hrColor = localStorage.getItem("cpHrColor");

  const setColor = (elementId, hexString) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.value = hexString;
    }
  };

  setColor("cpWebkitTextStrokeColor", rgbaToHex(webkitTextStrokeColor));
  setColor("cpBorderColor", rgbaToHex(borderColor));
  setColor("cpShadowColor", rgbaToHex(shadowColor));
  setColor("cpFontColor", rgbaToHex(fontColor));
  setColor("cpOutlineColor", rgbaToHex(outlineColor));
  setColor("cpBubbleBackgroundColor", rgbaToHex(bubbleBackgroundColor));
  setColor("cpHrColor", rgbaToHex(hrColor));

  if (window.cctPopup) {
    if (webkitTextStrokeColor) {
      window.cctPopup.document.documentElement.style.setProperty(
        "--webkit-text-stroke-color",
        webkitTextStrokeColor
      );
    }
    if (borderColor) {
      window.cctPopup.document.documentElement.style.setProperty(
        "--border-color",
        borderColor
      );
    }
    if (shadowColor) {
      window.cctPopup.document.documentElement.style.setProperty(
        "--shadow-color",
        shadowColor
      );
    }
    if (fontColor) {
      window.cctPopup.document.documentElement.style.setProperty(
        "--font-color",
        fontColor
      );
    }
    if (outlineColor) {
      window.cctPopup.document.documentElement.style.setProperty(
        "--outline-color",
        outlineColor
      );
    }
    if (bubbleBackgroundColor) {
      window.cctPopup.document.documentElement.style.setProperty(
        "--bubble-background-color",
        bubbleBackgroundColor
      );
    }
    if (hrColor) {
      window.cctPopup.document.documentElement.style.setProperty(
        "--hr-color",
        hrColor
      );
    }
  }
}

async function updatePreview() {
  //console.log("updatePreview()");
  let popupUrl = "https://securitylive.com/tts/translator.html?popup=aws&";

  if (location.hostname.includes("localhost")) {
    popupUrl =
      "http://localhost:8080/tts.bot/webfront/translator.html?popup=aws&";
  } else if (location.hostname.includes("dev.tts.bot")) {
    popupUrl = "https://dev.tts.bot/translator.html?popup=aws&";
  } else if (location.hostname.includes("tts.bot")) {
    popupUrl = "https://tts.bot/translator.html?popup=aws&";
  }

  const setVar = (varName, varValue) => {
    if (window.cctPopup) {
      window.cctPopup.document.documentElement.style.setProperty(
        "--" + varName,
        varValue
      );
    }
    popupUrl += `${varName}=${varValue}&`;
  };

  const fontFamily = document.getElementById("fontFamily").value;
  const fontWeight = document.getElementById("fontWeight").value;
  const fontColor = document.getElementById("cpFontColor").value;
  const fontColorOpacity = document.getElementById("fontColorOpacity").value;
  const fontSize = document.getElementById("fontSize").value;
  const webkitTextStrokeSize = document.getElementById(
    "webkitTextStrokeSize"
  ).value;
  const webkitTextStrokeColor = document.getElementById(
    "cpWebkitTextStrokeColor"
  ).value;
  const webkitTextStrokeColorOpacity = document.getElementById(
    "webkitTextStrokeColorOpacity"
  ).value;
  const bubbleBackgroundColor = document.getElementById(
    "cpBubbleBackgroundColor"
  ).value;
  const bubbleBackgroundOpacity = document.getElementById(
    "bubbleBackgroundOpacity"
  ).value;
  const borderColor = document.getElementById("cpBorderColor").value;
  const borderColorOpacity =
    document.getElementById("borderColorOpacity").value;
  const borderWidth = document.getElementById("borderWidth").value;
  const borderLineStyle = document.getElementById("borderLineStyle").value;
  const borderRadius = document.getElementById("borderRadius").value;
  const hrColor = document.getElementById("cpHrColor").value;
  const hrColorOpacity = document.getElementById("hrColorOpacity").value;
  const outlineColor = document.getElementById("cpOutlineColor").value;
  const outlineColorOpacity = document.getElementById(
    "outlineColorOpacity"
  ).value;
  const outlineOffset = document.getElementById("outlineOffset").value;
  const shadowColor = document.getElementById("cpShadowColor").value;
  const shadowColorOpacity =
    document.getElementById("shadowColorOpacity").value;
  const shadowOffsetHorizontal = document.getElementById(
    "shadowOffsetHorizontal"
  ).value;
  const shadowOffsetVertical = document.getElementById(
    "shadowOffsetVertical"
  ).value;
  const shadowBlur = document.getElementById("shadowBlur").value;

  setVar("font-family", fontFamily);
  setVar("font-weight", fontWeight);
  setVar("font-color", rgba(fontColor, fontColorOpacity));
  setVar("font-size", `${fontSize}px`);
  setVar("webkit-text-stroke-size", `${webkitTextStrokeSize}px`);
  setVar(
    "webkit-text-stroke-color",
    rgba(webkitTextStrokeColor, webkitTextStrokeColorOpacity)
  );
  setVar(
    "bubble-background-color",
    rgba(bubbleBackgroundColor, bubbleBackgroundOpacity)
  );
  setVar("border-color", rgba(borderColor, borderColorOpacity));
  setVar("border-width", `${borderWidth}px`);
  setVar("border-line-style", borderLineStyle);
  setVar("border-radius", `${borderRadius}px`);
  setVar("hr-color", rgba(hrColor, hrColorOpacity));
  setVar("outline-color", rgba(outlineColor, outlineColorOpacity));
  setVar("outline-offset", `${outlineOffset}px`);
  setVar("shadow-color", rgba(shadowColor, shadowColorOpacity));
  setVar("shadow-offset-horizontal", `${shadowOffsetHorizontal}px`);
  setVar("shadow-offset-vertical", `${shadowOffsetVertical}px`);
  setVar("shadow-blur", `${shadowBlur}px`);

  document.getElementById("txtCCTURL").value = popupUrl;
  //console.log("popup url:", popupUrl);
}

/**************************Client Connecting****************************/
function onConnecting(address, port) {
  document.getElementById("status").innerHTML = " [ Connecting...]";
}

function onConnected(address, port) {
  document.getElementById("status").innerHTML = " [ Connected ]";
  let message =
    "<speak>Connected to channel " + getSpokenName(con.channel) + ".</speak>";
  addSystemBubble(message, ++messageID);
  window.audioPlayer.Speak("", message, "", "system", "ssml", messageID);

  //window.audioPlayer.Speak("Connected to channel " + con.channel, "justin");

  localStorage.setItem(
    "twitch_username",
    document.getElementById("twitch_username").value
  );
  localStorage.setItem(
    "twitch_channel",
    document.getElementById("channel").value
  );
  localStorage.setItem(
    "systemVoice",
    document.getElementById("systemVoice").value
  );
  localStorage.setItem(
    "systemVoiceOption",
    document.getElementById("systemVoiceOption").value
  );

  if (localStorage.getItem("cbAutoTranslateChat")) {
    document.getElementById("cbAutoTranslateChat").checked = JSON.parse(
      localStorage.getItem("cbAutoTranslateChat")
    );
  } else if (
    document.getElementById("twitch_username").value ||
    document.getElementById("twitch_channel").value
  ) {
    document.getElementById("cbAutoTranslateChat").checked = true;
  }
}
/**************************Client Connecting****************************/
function onBan(channel, username, reason) {
  console.log("arguments:", arguments, "reason:", reason);
  //ttsBanByUser(channel.substring(1), username);
  window.audioPlayer.SpeakNow(
    "<speak>Hey chat, " +
      username +
      " was banned, thought you should know.</speak>",
    "system",
    "ssml"
  );
}

function onCheer() {
  /*
        let arguments = {
          0: "#security_live",
          1: {
            "badge-info": null,
            badges: {
              moderator: "1",
              glitchcon2020: "1",
            },
            bits: "5",
            color: "#B573B6",
            "display-name": "MojoJojo671",
            emotes: null,
            "first-msg": false,
            flags: null,
            id: "b8ee5ce1-09e0-4945-9916-99d3f4f821b9",
            mod: true,
            "returning-chatter": false,
            "room-id": "473060639",
            subscriber: false,
            "tmi-sent-ts": "1683212368956",
            turbo: false,
            "user-id": "531867432",
            "user-type": "mod",
            "emotes-raw": null,
            "badge-info-raw": null,
            "badges-raw": "moderator/1,glitchcon2020/1",
            username: "mojojojo671",
            "message-type": "chat",
          },
          2: "Cheer5",
        };
*/
  console.log("onCheer:");
  console.log(arguments);
  let username = arguments[1].username;
  let message = `${arguments[1]["display-name"]} just cheered ${arguments[1].bits} bits, thank you so much!`;

  addSystemBubble(message, ++messageID);
  window.audioPlayer.Speak("", message, "", "system", "text", messageID);

  addMessageBubble(username, arguments[2], "", true, "", ++messageID);

  let prefix = "<speak>" + getSpokenName(username) + " says </speak>";

  audioPlayer.Speak(prefix, arguments[2], "", username, "text", messageID);
}

function onSub() {
  console.log("onSub:");
  console.log(arguments);
}
function onRitual() {
  console.log("onRitual:");
  console.log(arguments);
}
function onRaid() {
  console.log("onRaid:");
  console.log(arguments);
}

/**************************Init and Connect to Chat****************************/
async function connect() {
  init();

  //Twitch Client
  var options = {
    options: {
      debug: false,
      skipUpdatingEmotesets: true,
    },
    connection: {
      cluster: "aws",
      reconnect: true,
    },
    identity: {
      username: document.getElementById("twitch_username").value,
      password: access_token,
    },
    channels: [sanitizeChanName(con.channel)],
  };

  window.client = tmi.client(options);

  window.client.connect();

  localStorage.setItem("channel", con.channel);

  //Attached Handlers
  window.client.on("chat", onChat);
  window.client.on("connecting", onConnecting);
  window.client.on("connected", onConnected);
  window.client.on("ban", onBan);
  window.client.on("cheer", onCheer);
  window.client.on("subscription", onSub);
  window.client.on("resub", onSub);
  window.client.on("ritual", onRitual);
  window.client.on("raided", onRaid);

  //Disable UI Elements
  document.getElementById("srcLangSelect").disabled = true;
  document.getElementById("dstLangSelect").disabled = true;
  document.getElementById("channel").disabled = true;
  document.getElementById("btn-go").disabled = true;

  await loadFFZEmotes();
  // Hack job to get twitch_id from FFZ first, call this second, always.
  await loadBTTVEmotes();
  await loadBTTVGlobalEmotes();

  if (document.getElementById("cbSendTextToWebsocket").checked) {
    websocketCustomConnect();
  }
  if (document.getElementById("cbSendTextToAWSWebsocket").checked) {
    websocketAWSConnect();
  }
}

function pause() {
  let btn = document.getElementById("btn-pause");
  console.log("Paused: " + window.audioPlayer.isPaused());
  if (window.audioPlayer.isPaused()) {
    document.getElementById("title").innerHTML = "🔊TTS Enabled";
    btn.innerHTML = `<i class="fa fa-pause" aria-hidden="true"></i>`;
    window.audioPlayer.Continue();
  } else {
    document.getElementById("title").innerHTML = "🔇TTS Paused";
    btn.innerHTML = `<i class="fa fa-play" aria-hidden="true"></i>`;
    window.audioPlayer.Pause();
  }
}

function enableCustomWebsocket(checked) {
  if (checked) {
    websocketCustomConnect();
  } else {
    websocketCustom.close();
  }
}

function enableAWSWebsocket(checked) {
  if (checked) {
    websocketAWSConnect();
  } else {
    websocketProd.close();
  }
}

function websocketCustomConnect() {
  console.log(
    "setting up websocket",
    document.getElementById("cbSendTextToWebsocket").value
  );
  var websocketURL = document.getElementById("txtWebsocketURL").value;

  try {
    websocketCustom = new WebSocket(websocketURL);
  } catch (err) {
    console.log("cannot connect to websocketCustom: catch(" + err + ")");
  }

  websocketCustom.onopen = function () {
    console.log("Connected to websocket backend.");
    localStorage.setItem("websocketURL", websocketURL);
  };

  websocketCustom.onmessage = function (event) {
    console.log("websocketCustom.message:", event);

    let command = JSON.parse(event.data);

    if (command.topic == "TTS") {
      console.log(command);
      window.audioPlayer.SpeakNow(
        command.text,
        command.username,
        "text",
        command.voice
      );
    } else {
      window.audioPlayer.SpeakNow(
        "<speak>" + event.data + "</speak>",
        "system",
        "ssml"
      );
    }
  };

  websocketCustom.onclose = function (e) {
    console.log(
      "Socket is closed. Reconnect will be attempted in 1 second.",
      e.reason
    );
    setTimeout(function () {
      websocketCustomConnect();
    }, 1000);
    //setInterval(websocketConnectRetry, 5000);
  };

  websocketCustom.onerror = function (err) {
    console.log("Websocket connect error to:", websocketURL, err);
    websocketCustom.close();
    //document.getElementById('cbSendTextToWebsocket').checked = false;
  };
}

function websocketAWSConnect() {
  console.log(
    "setting up AWS websocket",
    document.getElementById("cbSendTextToAWSWebsocket").value
  );
  var AWSWebsocketURL = document.getElementById("txtAWSWebsocketURL").value;

  websocketProd = new WebSocket(AWSWebsocketURL + "/?channel=" + con.channel);

  websocketProd.onopen = function () {
    console.log("Connected to AWS websocket backend.");
    localStorage.setItem("AWSWebsocketURL", AWSWebsocketURL);
    var wsObject = {
      action: "start",
      channel: con.channel,
      access_token: access_token,
      time: Date.now(),
    };
    websocketProd.send(JSON.stringify(wsObject));
  };

  websocketProd.onmessage = function (event) {};

  websocketProd.onclose = function (e) {
    console.log(
      "AWS Socket is closed. Reconnect will be attempted in 1 second.",
      e.reason
    );
    setTimeout(function () {
      websocketAWSConnect();
    }, 1000);
    //setInterval(websocketConnectRetry, 5000);
  };

  websocketProd.onerror = function (err) {
    console.log("AWS Websocket connect error to:", AWSWebsocketURL, err);
    websocketProd.close();
    //document.getElementById('cbSendTextToWebsocket').checked = false;
  };
}

function init() {
  //Get UI Controls
  var lc = document.getElementById("livechat");
  var lcc = document.getElementById("livechatc");
  var cbspeak = document.getElementById("cbSpeak");
  var cbsend = document.getElementById("cbAutoTranslateChat");
  var sendMessage = document.getElementById("message");

  //Cache values
  con = {
    channel: document.getElementById("channel").value,
    sourceLanguage: document.getElementById("srcLangSelect").value,
    targetLanguage: document.getElementById("dstLangSelect").value,
    liveChatUI: lc,
    liveChatUIContainer: lcc,
    cbSpeak: cbspeak,
    cbAutoTranslateChat: cbsend,
    sendMessage: sendMessage,
  };

  lc.innerHTML = "";

  window.audioPlayer = AudioPlayer();
}

function loadAndSortLanguages() {
  for (const key in supportedLanguages.en) {
    var lang = supportedLanguages.en[key];
    var tmp = {};
    tmp.languageCode = key;
    tmp.languageName = lang;
    sortedLanguages.push(tmp);
  }
  sortedLanguages.sort(function (a, b) {
    return a.languageName > b.languageName ? 1 : -1;
  });
}

function voiceSelected(voice) {
  var userVoiceOptionSource = document.getElementById(
      "system-voice-option-template"
    ).innerHTML,
    userVoiceOptionTemplate = Handlebars.compile(userVoiceOptionSource),
    userVoiceOptionPlaceholder = document.getElementById(
      "systemVoiceOptionPlaceholder"
    );
  userVoiceOptionPlaceholder.innerHTML = userVoiceOptionTemplate(
    voices[voice.toLowerCase()]
  );
  var voiceOption = document.getElementById("voice-option");
  voiceOption.value = voices[voice.toLowerCase()].voiceOptions[0];

  localStorage.setItem(
    "systemVoice",
    document.getElementById("systemVoice").value
  );
  localStorage.setItem(
    "systemVoiceOption",
    document.getElementById("systemVoiceOption").value
  );
}

function voiceOptionSelected(voiceOption) {
  var voiceOptionElement = document.getElementById("voice-option");
  voiceOptionElement.value = voiceOption;

  localStorage.setItem(
    "systemVoice",
    document.getElementById("systemVoice").value
  );
  localStorage.setItem(
    "systemVoiceOption",
    document.getElementById("systemVoiceOption").value
  );
}

function saveLocalStorageLang(elementId) {
  console.log("elementId:", elementId);
  localStorage.setItem(elementId, document.getElementById(elementId).value);
}

/**************************Init and Connect to Chat****************************/

function getHTMLEntityEncoding(char) {
  switch (char) {
    case "<":
      return "&lt;";
    case ">":
      return "&gt;";
    case "'":
      return "&apos;";
    case '"':
      return "&quote;";
    case "&":
      return "&amp;";
    case ";":
      return "&semi;";
  }
}

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**************************Receive and Translate Chat****************************/
async function onChat(channel, userstate, message, self) {
  let speakEmotes = document.getElementById("cbSpeakEmotesTTS").checked;
  let dedupEmotes = document.getElementById("cbDedupEmotesTTS").checked;
  let matchedEmotes = [];
  // Don't listen to my own messages..
  channel = channel.replace("#", "");
  message = message.trim();

  //console.log(userstate);
  //console.log("message", message);
  //console.log("chatters:", chatters);

  if (userstate["custom-reward-id"]) {
    console.log(userstate);
  }

  if (userstate["custom-reward-id"] == "9914796b-d33c-4317-bb9e-e66b5d372ac2") {
    console.log("inject script redeem");
    deleteTwitchChatMessage(twitch_id, userstate.id);
    return;
  }

  // TODO delete messages with injection stuffs
  // || message.match('(?!<\w+>.*</\w+>)')

  if (self) return;

  //console.log("userstate:", userstate);
  var username = userstate["username"];

  if (message.match(/^(oneword|one word|!oneword)/i)) {
    addSystemBubble(message, ++messageID);
    return;
  }

  let allowTTS = false;
  let allowTTSmessage = "";

  if (document.getElementById("cbEveryoneTTS").checked) {
    //console.log("cbEveryone");
    allowTTS = true;
  } else if (document.getElementById("cbModTTS").checked && userstate.mod) {
    //console.log("cbMod");
    allowTTS = true;
  } else if (
    document.getElementById("cbVipTTS").checked &&
    userstate.badges.hasOwnProperty("vip")
  ) {
    //console.log("cbVip");
    allowTTS = true;
  } else if (
    document.getElementById("cbSubTTS").checked &&
    userstate.subscriber
  ) {
    //console.log("cbSub");
    allowTTS = true;
  }

  if (!speakEmotes && userstate["emote-only"]) {
    allowTTS = false;
    allowTTSmessage += "Emote Only Chat - ";
  } else if (!speakEmotes || (speakEmotes && dedupEmotes)) {
    var emoteParsingStart = window.performance.now();

    var twitchEmotes = [];
    for (const key in userstate.emotes) {
      var strPos = userstate.emotes[key][0].split("-");
      twitchEmotes.push(
        message.substring(parseInt(strPos[0]), parseInt(strPos[1]) + 1)
      );
    }
    for (let emote of twitchEmotes) {
      emote = escapeRegExp(emote);
      matchedEmotes.push(message.match(emote));
      message = message.replaceAll(emote, "");
    }
    for (const emote of bttvEmotes) {
      //console.log("bttv emote:", emote);
      matchedEmotes.push(message.match(emote));
      message = message.replaceAll(emote, "");
    }
    for (const emote of ffzEmotes) {
      matchedEmotes.push(message.match(emote));
      message = message.replaceAll(emote, "");
    }

    //console.log("matched emotes:", matchedEmotes);

    //console.log("Base message is now:", message);

    matchedEmotes = matchedEmotes.filter(function (element) {
      return element != null;
    });
    if (speakEmotes && dedupEmotes) {
      for (const emote of matchedEmotes) {
        message += " " + emote[0];
      }
    }
    //console.log("found emotes:", matchedEmotes[0][0]);

    var time_diff = window.performance.now() - emoteParsingStart;
    /*console.log(
                                                    "processed emotes in:",
                                                    parseFloat(time_diff).toFixed(2),
                                                    "ms"
                                                  );*/
  }

  if (
    username == "streamelements" ||
    username == "pretzelrocks" ||
    username.includes("welcome to my channel")
  ) {
    last_speaker = username;
    return;
  }

  ssmlTextType = "text";
  if (message.match("^<speak>.*</speak>$")) {
    ssmlTextType = "ssml";
  } else if (message.match("<speak>.*</speak>")) {
  }

  if (!chatters.hasOwnProperty(username)) {
    chatters[username] = {};
    chatters[username].voice = "justin";
    chatters[username].voice_option = "standard";
    chatters[username].spoken_name = username;
    chatters[username].ttsBanned = false;
    chatters[username].display_name = userstate["display-name"];
    chatters[username].color = userstate.color;
    localStorage.setItem("chatters", JSON.stringify(chatters));
  }

  await loadVoice(userstate);
  localStorage.setItem("chatters", JSON.stringify(chatters));

  if (
    chatters[username].hasOwnProperty("ttsBanned") &&
    chatters[username].ttsBanned
  ) {
    allowTTS = false;
    allowTTSmessage += "TTS Banned - ";
  }

  if (message) {
    if (message.match("(^s*!)")) {
      runChatCommand(channel, username, message, userstate.mod);

      if (document.getElementById("cbDeleteCommands").checked) {
        deleteTwitchChatMessage(twitch_id, userstate.id);
      }
      return;
    }

    var params = {
      //Settings: {
      //  Profanity: "MASK"
      //},
      Text: message,
      SourceLanguageCode: con.sourceLanguage,
      TargetLanguageCode: con.targetLanguage,
    };

    window.translator.translateText(
      params,
      function onIncomingMessageTranslate(err, data) {
        //console.log('Original Message  : ' + message);
        //console.log('Translated Message: ' + data.TranslatedText);

        var translatedMessage = data.TranslatedText;
        var identicalTranslation = false;
        if (message.trim() === translatedMessage.trim()) {
          identicalTranslation = true;
        }

        if (err) {
          console.log("Error calling Translate. " + err.message + err.stack);
        }
        if (data) {
          let spokenText = translatedMessage;
          spokenText = spokenText.replace(/&/g, function (i) {
            return "and";
          });
          translatedMessage = translatedMessage.replace(
            /[<>;&'"]/g,
            function (i) {
              var entity = getHTMLEntityEncoding(i);
              return entity;
            }
          );
          message = message.replace(/[<>;&'"]/g, function (i) {
            var entity = getHTMLEntityEncoding(i);
            return entity;
          });

          var targetLang = document.getElementById("dstLangSelect").value;
          var translatedFromMessage = "";

          if (
            document.getElementById("dstLangSelect").value !=
            data.SourceLanguageCode
          ) {
            if (message.startsWith("~")) {
              spokenText = message.substring(1);
            } else {
              translatedFromMessage =
                "Translated from " +
                supportedLanguages.en[data.SourceLanguageCode];
            }

            if (con.cbAutoTranslateChat.checked && !identicalTranslation) {
              window.client.action(
                con.channel,
                chatters[username].display_name +
                  ": " +
                  translatedMessage +
                  " (Translated from " +
                  supportedLanguages.en[data.SourceLanguageCode] +
                  ")"
              );
            }
          }

          let similarity = 0;
          let minSimilarity = 75;
          let maxTimeAgoMS = 300000;
          let now = Date.now();

          if (document.getElementById("cbUserLevDistance").checked) {
            minSimilarity = parseInt(
              document.getElementById("txtUserLevPct").value
            );
            maxTimeAgoMS =
              parseInt(document.getElementById("txtUserLevTime").value) * 1000;
            if (
              localChattersData[username] &&
              localChattersData[username].hasOwnProperty("lastMessages")
            ) {
              for (const message of localChattersData[username].lastMessages) {
                similarity = similarityPercentage(spokenText, message.message);

                if (
                  similarity > minSimilarity &&
                  now - message.timestamp < maxTimeAgoMS
                ) {
                  allowTTS = false;
                  let percentage = Math.round(similarity) + "%";
                  allowTTSmessage += `User Lev Distance ${percentage} - `;
                  break;
                }
              }

              const startIndex = Math.max(
                0,
                localChattersData[username].lastMessages.length - 20
              );
              localChattersData[username].lastMessages =
                localChattersData[username].lastMessages.slice(startIndex);
            }
          }

          now = Date.now();

          if (document.getElementById("cbChatLevDistance").checked) {
            maxTimeAgoMS =
              parseInt(document.getElementById("txtChatLevTime").value) * 1000;
            minSimilarity = parseInt(
              document.getElementById("txtChatLevPct").value
            );
            for (const message of lastMessages) {
              similarity = similarityPercentage(spokenText, message.message);

              if (
                similarity > minSimilarity &&
                now - message.timestamp < maxTimeAgoMS
              ) {
                allowTTS = false;
                let percentage = Math.round(similarity) + "%";
                allowTTSmessage += `Chat Lev Distance ${percentage} - `;
                break;
              }
            }

            const startIndex = Math.max(0, lastMessages.length - 20);
            lastMessages = lastMessages.slice(startIndex);
          }

          let translatedMessageHTML = "";
          if (
            document.getElementById("dstLangSelect").value !=
            data.SourceLanguageCode
          ) {
            translatedMessageHTML = `${translatedMessage} (${translatedFromMessage})`;
          }

          if (identicalTranslation) translatedMessageHTML = "";

          let bubbleText = message;

          // Option to replace @usernames with spoken names.
          if (document.getElementById("cbReplaceAtNames").checked) {
            let userRegex = /@([A-Za-z0-9_]+)/g;

            let userMatches = [...spokenText.matchAll(userRegex)]; // Convert the iterator to an array

            if (userMatches.length > 0) {
              // Check if there are any matches
              //console.log(userMatches);

              let usernames = new Set(); // Create a Set to store unique usernames

              for (const [, username] of userMatches) {
                // Destructure and iterate through the matches
                usernames.add(username); // Add the username (without '@') to the Set
              }

              for (let username of usernames) {
                // Iterate through unique usernames
                let user = username.toLowerCase();
                if (chatters[user]) {
                  let spokenName = chatters[user].spoken_name;
                  if (chatters[user].color) {
                    color = chatters[user].color;
                  } else {
                    color = GetColorForUsername(user);
                  }

                  spokenText = spokenText.replaceAll(
                    "@" + username,
                    spokenName
                  );
                  bubbleText = bubbleText.replaceAll(
                    "@" + username,
                    `<strong style='color:${color}'>@${username}:</strong><span class="message-at-reference">(${spokenName.trim()})</span>`
                  );
                }
              }
            }
          }

          // TODO speak text up to comment delimiter
          if (message.match("(^s*-|^s*#|^s*<!--|^s*;|^s*//)")) {
            allowTTS = false;
            allowTTSmessage = "Commentted out - ";
          }

          addMessageBubble(
            username,
            bubbleText,
            translatedMessageHTML,
            allowTTS,
            allowTTSmessage,
            ++messageID
          );

          //If speak translation in enabled, speak translated message
          if (con.cbSpeak.checked && allowTTS) {
            var regex = /_/gi;
            var longnumex = /\d{6,}/;
            var linkex =
              /(?:(?:https?):\/\/)?(?:[\w-]+(?:\.[\w-]+)+)(?:\/[^\s]*)?/g;
            //var longex = /\S{100,}/g;

            spokenText = spokenText.replace(regex, " ");
            spokenText = spokenText.replace(linkex, " (Web link) ");
            //spokenText = spokenText.replace(longnumex, " (Long number) ");
            //spokenText = spokenText.replace(longex, ' (long word) ');

            var prefix = "";
            if (last_speaker != username) {
              prefix = "<speak>" + getSpokenName(username) + " says </speak>";
            }
            audioPlayer.Speak(
              prefix,
              spokenText,
              translatedFromMessage,
              username,
              ssmlTextType,
              messageID
            );

            if (!localChattersData[username]) {
              localChattersData[username] = {};
              localChattersData[username].lastMessages = [];
              console.log(
                `A new chatter has entered the ring: ${username} --  ${spokenText} -- ${similarity}`
              );
            }

            let tmpMessage = {
              message: spokenText,
              timestamp: Date.now(),
            };

            localChattersData[username].lastMessages.push(tmpMessage);
            lastMessages.push(tmpMessage);

            last_speaker = username;
          } else {
            console.log("DENIED TTS:", userstate);
          }

          con.liveChatUIContainer.scrollTop =
            con.liveChatUIContainer.scrollHeight;
        }
      }
    );
  }
}

function addMessageBubble(
  username,
  message,
  translatedMessageHTML,
  allowTTS,
  allowTTSmessage,
  messageID
) {
  let buttons =
    makeButton("TTS Ban", "warning", "volume-xmark", username, messageID) +
    makeButton("Ban", "danger", "gavel", username, messageID);

  //  let buttons = makeButton("Don't Speak", "secondary", "comment-slash", username, messageID) +
  //makeButton("Speak Next", "success", "comment-medical", username, messageID) +
  //console.log("User replacement start: " + spokenText);

  let userVoice = `${chatters[username].voice} (${chatters[username].voice_option})`;

  let speakerIcon = "🔊";
  if (!allowTTS) {
    userVoice = `(${allowTTSmessage.slice(0, -3)})`;
    speakerIcon = "🔇";
  }

  let color = "#FFFFFF";
  if (chatters[username].color) {
    color = chatters[username].color;
  } else {
    color = GetColorForUsername(username);
  }

  con.liveChatUI.innerHTML += `<div id="message-id${messageID}" class="chat-bubble">
                                          <div class="username-container" id="message-user-id${messageID}">
                                            <div class="speaker-info">
                                              <span class="speaker-icon">${speakerIcon}</span>
                                              <span id="message-system-voice-id${messageID}" class="voice-name">SYSTEM VOICE</span>
                                            </div>
                                            <span class="username">
                                              <strong style='color:${color}'>${
    chatters[username].display_name
  }:</strong><br>
                                              (${chatters[
                                                username
                                              ].spoken_name.trim()})
                                            </span>
                                          </div>

                                          <div class="message-container" id="message-message-id${messageID}">
                                            <div class="speaker-info">
                                              <span class="speaker-icon">${speakerIcon}</span>
                                              <span class="voice-name">${userVoice}</span>
                                            </div>
                                            <span class="message">
                                              ${message}<br>
                                              ${translatedMessageHTML}
                                            </span>
                                          </div>

                                          <div class="buttons-container d-flex justify-content-center" >
                                            <div class="btn-group p-1">${buttons}</div>
                                          </div>
                                        </div>`;
}

function addSystemBubble(message, messageID) {
  con.liveChatUI.innerHTML += `<div id="message-id${messageID}" class="chat-bubble">
                          <div class="username-container" id="message-user-id${messageID}">
                            <div class="speaker-info">
                              <span class="speaker-icon">🔊</span>
                              <span id="message-system-voice-id${messageID}" class="voice-name">SYSTEM VOICE</span>
                            </div>
                            <span class="username">
                              <strong style="color:${GetColorForUsername(
                                "System"
                              )}">System</strong>
                             </span>
                          </div>

                          <div class="message-container" id="message-message-id${messageID}">
                            <span class="message">
                              ${message}
                            </span>
                          </div>
                          <div class="buttons-container"><span class="btn-group"></span></div>
                        </div>
                        `;
}

function makeButton(btnName, btnClass, btnIcon, btnArgument, mID) {
  var messageButtonName = btnName.replace(/\W/g, "");

  if (messageButtonName == "TTSBan" && chatters[btnArgument].ttsBanned) {
    btnName = "TTS Unban";
    messageButtonName = "TTSUnban";
  } else if (messageButtonName == "DontSpeak") {
    btnArgument = mID;
  }

  let btnPadding = "px-4";
  switch (messageButtonName) {
    case "TTSBan":
      btnPadding = "px-2";
      break;
    case "TTSUnban":
      btnPadding = "px-2";
      break;
  }

  return `<button id="messageButton-${messageButtonName}-id${mID}"
                                                class="btn btn-sm btn-${btnClass} py-0 ${btnPadding}"
                                                title="${messageButtonName}"
                                                onclick='onButtonClick("${messageButtonName}", "${btnArgument}", event)'>
                                          <div>
                                            <i class="fa-solid fa-${btnIcon}"></i>
                                          </div>
                                          <div>
                                            <span class="small">${btnName}</span>
                                          </div>
                                        </button>`;
}

function onButtonClick(button, argument, event) {
  console.log(`onButtonClick(${button}, ${argument}, ${event})`);

  if (button == "Ban") {
    ttsBanByUser(con.channel, argument);
  } else if (button == "TTSBan") {
    ttsBan(con.channel, "!ttsban " + argument, true);
  } else if (button == "TTSUnban") {
    ttsBan(con.channel, "!ttsban " + argument, false);
  } else if (button == "SpeakNext") {
    ttsBan(con.channel, "!ttsban " + argument, true);
  } else if (button == "DontSpeak") {
    skipMessage(arguement);
    //event.target.disabled = true;
  }
}

function levenshteinDistance(s1, s2) {
  s1 = s1.toLowerCase().trim();
  s2 = s2.toLowerCase().trim();
  if (s1.length > s2.length) {
    [s1, s2] = [s2, s1];
  }

  let distances = Array.from({ length: s1.length + 1 }, (_, i) => i);

  for (let i2 = 0; i2 < s2.length; i2++) {
    const c2 = s2[i2];
    let distances_ = [i2 + 1];
    for (let i1 = 0; i1 < s1.length; i1++) {
      const c1 = s1[i1];
      if (c1 === c2) {
        distances_.push(distances[i1]);
      } else {
        distances_.push(
          1 +
            Math.min(
              distances[i1],
              distances[i1 + 1],
              distances_[distances_.length - 1]
            )
        );
      }
    }
    distances = distances_;
  }

  return distances[distances.length - 1];
}

function similarityPercentage(s1, s2) {
  const levenshteinDist = levenshteinDistance(s1, s2);
  const longestLength = Math.max(s1.length, s2.length);
  return (1 - levenshteinDist / longestLength) * 100;
}

function runChatCommand(channel, username, message, mod) {
  if (!chatters.hasOwnProperty(username)) {
    chatters[username] = {};
  }

  console.log("channel:" + channel + ":" + username + ":");

  if (message.startsWith("!setvoice")) {
    parts = message.split(" ");
    var voice = "justin";
    var voice_option = "standard";

    if (parts.length < 2) {
      return;
    }

    voice = parts[1];

    if (parts.length > 2) {
      voice_option = parts[2];
    }

    // Check if parameter is a 1 or more digit number
    if (/^(\d+)$/.test(voice)) {
      var i = parseInt(voice);
      voice = voicesDesc.Voices[i].Id;
    }

    voice = voice.toLowerCase();
    if (!voices.hasOwnProperty(voice)) {
      voice = "justin";
    }

    if (!voices[voice].voiceOptions.includes(voice_option)) {
      voice_option = voices[voice].voiceOptions[0];
    }

    chatters[username].voice = voice;

    if (voice_option == "neural" || voice_option == "standard") {
      chatters[username].voice_option = voice_option;
    }
    saveTTSConfig(channel, username);
  } else if (
    message.startsWith("!setspoken") ||
    message.startsWith("!setname")
  ) {
    message = message.replace("!setspoken", "");
    message = message.replace("!setname", "");
    message = message.trim();
    if (message == "") {
      chatters[username].spoken_name = username;
    } else {
      chatters[username].spoken_name = message;
    }
    saveTTSConfig(channel, username);
  } else if (message.startsWith("!voices")) {
    sendVoiceListToChat();
  } else if (
    message.startsWith("!poof") ||
    message.startsWith("!poop") ||
    message.startsWith("!pop")
  ) {
    window.audioPlayer.PopLastMessage(username);
  } else if (message.startsWith("!ttsdump") || message.startsWith("!dump")) {
    parts = message.split(" ");
    if (parts.length < 2 && (mod || channel == username)) {
      window.audioPlayer.Dump();
    } else if (parts.length > 1 && (mod || channel == username)) {
      var user = parts[1];
      window.audioPlayer.DumpByUser(user);
    } else {
      window.audioPlayer.DumpByUser(username);
    }
  } else if (message.startsWith("!ttsban") && (mod || channel == username)) {
    ttsBan(channel, message, true);
  } else if (message.startsWith("!ttsunban") && (mod || channel == username)) {
    ttsBan(channel, message, false);
  } else if (
    (message.startsWith("!tts-pause") || message.startsWith("!ttspause")) &&
    (mod || channel == username) &&
    !window.audioPlayer.isPaused()
  ) {
    pause();
  } else if (
    (message.startsWith("!tts-unpause") || message.startsWith("!ttsunpause")) &&
    (mod || channel == username) &&
    window.audioPlayer.isPaused()
  ) {
    pause();
  }
}

function ttsBan(channel, message, ban) {
  parts = message.split(" ");
  if (parts.length > 1) {
    var user = parts[1].toLowerCase();
    user = user.replace("@", "");
    if (ban) {
      window.audioPlayer.DumpByUser(user);
    }
    chatters[user].ttsBanned = ban;
    saveTTSConfig(channel, user);
  }
}

function ttsBanByUser(channel, user) {
  chatters[user].ttsBanned = true;
  window.audioPlayer.DumpByUser(user);
  saveTTSConfig(channel, user);
  banUser(twitch_id, user);

  /*client.ban(channel, user).then(function () {
                                                        console.log("Successfully banned " + user.username + " on " + channel + "!");
                                                      }, function (err) {
                                                        console.log(err);
                                                      });*/
}

function ttsUnbanByUser(channel, user) {
  chatters[user].ttsBanned = false;
  //window.audioPlayer.DumpByUser(user);
  saveTTSConfig(channel, user);
  unbanUser(twitch_id, user);
  /*
                                                      client.unban(channel, user).then(function () {
                                                        console.log("Successfully unbanned " + user.username + " on " + channel + "!");
                                                      }, function (err) {
                                                        console.log(err);
                                                      });
                                                      */
}

async function deleteTwitchChatMessage(channel_id, message_id) {
  (async () => {
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${channel_id}&moderator_id=${channel_id}&message_id=${message_id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Client-ID": "dan71ek0pct1u7b8ht5u4h55zlcxvq",
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      if (response.ok) {
        console.log("Message deleted successfully.");
      } else {
        console.error("Error deleting message:", response);
      }
    } catch (error) {
      console.error("Error deleting message 2:", error);
    }
  })();
}

async function banUser(channel_id, login, reason) {
  if (!reason) {
    reason = "no reason specified";
  }

  console.log("channel_id:", twitch_id, "login:", login);
  let login_id_to_ban = null;

  await $.ajax({
    url: "https://api.twitch.tv/helix/users?login=" + login,
    type: "GET",
    headers: {
      "client-id": "dan71ek0pct1u7b8ht5u4h55zlcxvq",
      Authorization: "Bearer " + access_token,
    },
    success: function (response) {
      console.log(response);
      login_id_to_ban = response.data[0].id;
      console.log("banUser() got login_id:", login_id_to_ban);
    },
    error: function (response) {
      console.log("unable to lookup", login, "for ban");
    },
  });

  if (login_id_to_ban) {
    console.log(
      "url:",
      `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${channel_id}&moderator_id=${channel_id}`
    );
    await $.ajax({
      url: `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${channel_id}&moderator_id=${channel_id}`,
      type: "POST",
      dataType: "json",
      contentType: "application/json",
      headers: {
        "Client-ID": "dan71ek0pct1u7b8ht5u4h55zlcxvq",
        Authorization: `Bearer ${access_token}`,
      },
      data: JSON.stringify({
        data: {
          user_id: login_id_to_ban,
          reason: reason,
          // Optionally, you can add a duration and a reason:
          // duration: TIMEOUT_DURATION_IN_SECONDS,
          // reason: "REASON_FOR_BAN_OR_TIMEOUT"
        },
      }),
      success: function (response) {
        console.log("User banned successfully:", response);
      },
      error: function (error) {
        console.error("Error banning user:", error);
      },
    });
  }
}

async function unbanUser(channel_id, login) {
  console.log("channel_id:", twitch_id, "login:", login);
  let login_id_to_unban = null;

  await $.ajax({
    url: "https://api.twitch.tv/helix/users?login=" + login,
    type: "GET",
    headers: {
      "client-id": "dan71ek0pct1u7b8ht5u4h55zlcxvq",
      Authorization: "Bearer " + access_token,
    },
    success: function (response) {
      console.log(response);
      login_id_to_unban = response.data[0].id;
      console.log("unbanUser() got login_id:", login_id_to_unban);
    },
    error: function (response) {
      console.log("unable to lookup", login, "for ban");
    },
  });

  if (login_id_to_unban) {
    console.log(
      "url:",
      `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${channel_id}&moderator_id=${channel_id}&user_id=${login_id_to_unban}`
    );
    await $.ajax({
      url: `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${channel_id}&moderator_id=${channel_id}&user_id=${login_id_to_unban}`,
      type: "DELETE",
      dataType: "json",
      contentType: "application/json",
      headers: {
        "Client-ID": "dan71ek0pct1u7b8ht5u4h55zlcxvq",
        Authorization: `Bearer ${access_token}`,
      },
      success: function (response) {
        console.log("User banned successfully:", response);
      },
      error: function (error) {
        console.error("Error banning user:", error);
      },
    });
  }
}

async function saveTTSConfig(channel, username) {
  //('saveTTSConfig(' + channel + ',' + username + ')');
  var data = {};
  var request = {};
  data.login = username;
  data.voice = chatters[username].voice;
  data.voice_option = chatters[username].voice_option;
  data.spoken_name = chatters[username].spoken_name;
  data.ttsBanned = chatters[username].ttsBanned;
  data.access_token = access_token;
  request.data = [];
  request.data.push(data);
  //console.log("saveTTSConfig request data:", request);
  var url = "https://api.tts.bot/tts/" + channel + "/" + username;
  await $.ajax({
    url: url,
    type: "PUT",
    dataType: "json",
    contentType: "application/json",
    data: JSON.stringify(request),
    success: function (response) {
      console.log("Config Saved Successfully:", response);

      //alert("Save Much Success!");
    },
    error: function (error) {
      console.log("Config Save Failed:", error);
      return;
    },
  });
  localStorage.setItem("chatters", JSON.stringify(chatters));
  //console.log("localStorage:", localStorage.getItem('chatters'));
}

async function buildVoiceLookup() {
  return new Promise(function (resolve, reject) {
    //console.log('buildVoiceLookup()');

    var polly = new AWS.Polly();
    //console.log('pulling voices from AWS API');
    var params = {};

    polly.describeVoices(params, async function (err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
        reject(err);
      } else {
        voicesDesc = data;
        for (var i = 0; i < voicesDesc.Voices.length; i++) {
          var lcvoice = voicesDesc.Voices[i].Id.toLowerCase();
          var idvoice = voicesDesc.Voices[i].Id;
          voices[lcvoice] = {};
          voices[lcvoice].engine = voicesDesc.Voices[i].SupportedEngines[0];
          voices[lcvoice].voiceOptions = voicesDesc.Voices[i].SupportedEngines;
          voices[lcvoice].name = idvoice;
        }
        voicesDesc.Voices.sort(function (a, b) {
          if (a.LanguageCode === b.LanguageCode) {
            return b.Id - a.Id;
          }
          return a.LanguageCode > b.LanguageCode ? 1 : -1;
        });
        resolve();
      }
    });
    //console.log(voices);
  });
}

function sendVoiceListToChat() {
  /*
                                                      var neuralVoices = '';
                                                      var standardVoices = '';
                                                      for (var i = 0; i < voicesDesc.Voices.length; i++) {
                                                        var voice = voicesDesc.Voices[i];
                                                        if (voice.SupportedEngines[0] == 'standard') {
                                                          standardVoices += i + ': ' + voice.Id + ' (' + voice.LanguageName + '), ';
                                                        } else if (voice.SupportedEngines[0] == 'neural') {
                                                          neuralVoices += i + ': ' + voice.Id + ' (' + voice.LanguageName + '), ';
                                                        }
                                                      }
                                                      window.client.action(con.channel, 'Neural Voices: ' + neuralVoices);
                                                      window.client.action(con.channel, 'Standard Voices: ' + standardVoices);
                                                      */
  window.client.action(
    con.channel,
    "Configure your voice here: https://securitylive.com/tts-config.html"
  );
}

async function loadVoice(lvuserstate) {
  let username = lvuserstate.username;
  //console.log('loadVoice(' + username + ')');
  var channel = document.getElementById("channel").value;
  var hasLocalChannelConfig = false;
  await $.ajax({
    url: "https://api.tts.bot/tts/" + channel + "/" + username,
    success: function (response) {
      //console.log("Data for " + channel + ":", response);
      if (response.hasOwnProperty("Item")) {
        //console.log('loadVoice(' + channel + '): ' + response.Item.voice.toLowerCase() + ' from DynamoDB');
        chatters[username] = {};
        chatters[username].voice = response.Item.voice.toLowerCase();
        chatters[username].voice_option = response.Item.voice_option;
        chatters[username].spoken_name = response.Item.spoken_name;
        chatters[username].ttsBanned = response.Item.ttsBanned;
        chatters[username].display_name = response.Item.display_name;
        chatters[username].color = lvuserstate.color;
        hasLocalChannelConfig = true;
      }
    },
    error: function (request, status, error) {
      console.log("loadVoice(" + channel + ") error: using Brian");
      chatters[username].voice = "brian";
      chatters[username].voice_option = "standard";
      chatters[username].display_name = lvuserstate["display-name"];
      chatters[username].color = lvuserstate.color;
    },
  });

  if (!hasLocalChannelConfig) {
    //console.log("Does not have local config.");
    await $.ajax({
      url: "https://api.tts.bot/tts/all/" + username,
      success: function (response) {
        //console.log("Data from all for:", response);
        if (response.hasOwnProperty("Item")) {
          //console.log('loadVoice(global): ' + response.Item.voice.toLowerCase() + ' from DynamoDB');
          chatters[username] = {};
          chatters[username].voice = response.Item.voice.toLowerCase();
          chatters[username].voice_option = response.Item.voice_option;
          chatters[username].spoken_name = response.Item.spoken_name;
          chatters[username].ttsBanned = response.Item.ttsBanned;
          chatters[username].display_name = response.Item.display_name;
          chatters[username].color = lvuserstate.color;
        } else if (chatters[username].hasOwnProperty("voice")) {
          //console.log('loadVoice() chatters[' + username + '].voice: ' + chatters[username].voice);
          chatters[username].voice = "justin";
          chatters[username].voice_option = "standard";
          chatters[username].spoken_name = username;
          chatters[username].ttsBanned = false;
          chatters[username].display_name = lvuserstate["display-name"];
        } else {
          //console.log('loadVoice() catchall: using Justin for ' + username);
          chatters[username].voice = "justin";
          chatters[username].voice_option = "standard";
          chatters[username].spoken_name = username;
          chatters[username].ttsBanned = false;
          chatters[username].display_name = lvuserstate["display-name"];
          chatters[username].color = lvuserstate.color;
        }
      },
      error: function (request, status, error) {
        console.log("loadVoice(global) error: using Brian");
        chatters[username].voice = "brian";
        chatters[username].voice_option = "standard";
        chatters[username].ttsBanned = false;
        chatters[username].display_name = lvuserstate["display-name"];
        chatters[username].color = lvuserstate.color;
      },
    });
  }
}

function getSpokenName(username) {
  if (chatters[username] == undefined) {
    return username;
  } else if (chatters[username].spoken_name == undefined) {
    return username;
  } else {
    return chatters[username].spoken_name;
  }
}

/**************************Send Message****************************/

function message_key(ele) {
  if (event.key === "Enter") {
    sendMessage();
  }
}

function sendMessage() {
  if (con.sendMessage.value) {
    message = con.sendMessage.value;
    var params = {
      Text: con.sendMessage.value,
      SourceLanguageCode: con.targetLanguage,
      TargetLanguageCode: document.getElementById("chatLangSelect").value,
    };

    window.translator.translateText(
      params,
      function onSendMessageTranslate(err, data) {
        if (err) {
          console.log("Error calling Translate. " + err.message + err.stack);
        }
        if (data) {
          //console.log("M: " + message);
          //console.log("T: " + translatedMessage);
          var translatedMessage = data.TranslatedText;

          //Send message to chat
          window.client.action(con.channel, translatedMessage);

          //Clear send message UI
          con.sendMessage.value = "";

          //Print original message in Translated UI
          con.liveChatUI.innerHTML +=
            "<strong> ME: </strong>: " + message + "<br>";
          con.liveChatUI.innerHTML +=
            "<strong> ME: </strong>: " + translatedMessage + "<br>";

          //Scroll chat and translated UI to bottom to keep focus on latest messages
          con.liveChatUIContainer.scrollTop =
            con.liveChatUIContainer.scrollHeight;
        }
      }
    );
  }
}

function sendVoiceMessage(text) {
  if (text) {
    window.client.action(con.channel, text);

    //Print original message in Translated UI
    con.liveChatUI.innerHTML += "<strong> ME: </strong>: " + text + "<br>";

    //Print translated message in Chat UI
    con.liveChatUI.innerHTML += "<strong> ME: </strong>: " + text + "<br>";

    //Scroll chat and translated UI to bottom to keep focus on latest messages
    con.liveChatUIContainer.scrollTop = con.liveChatUIContainer.scrollHeight;
  }
}

/**************************Send Message****************************/

/**************************Audio player****************************/
function AudioPlayer() {
  //console.log('AudioPlayer()');
  // start listening on mic for streamer voice recognition, don't do TTS while streamer is speaking
  vr_function();
  var audioPlayer = document.createElement("audio");
  audioPlayer.setAttribute("id", "audioPlayer");
  document.body.appendChild(audioPlayer);

  var isSpeaking = false;
  this.isPaused = false;
  var banRequested = false;
  var currentSpokenMessage = {};
  var banMessage = {};
  var lastQueuedMessage = {};

  var speaker = {
    self: this,
    messageQueue: [],
    isPaused: function () {
      return isPaused;
    },
    Speak: async function (prefix, text, suffix, username, ssmlTextType, mID) {
      //console.log("Speaking: " + text + " -- with voice: " + voice);
      //If currently speaking a message, add new message to the messageQueue
      let message = {};
      message.prefix = prefix;
      message.suffix = suffix;
      message.text = text;
      message.username = username;
      message.ssmlTextType = ssmlTextType;
      message.messageID = mID;

      if (isSpeaking || streamerIsSpeaking || isPaused) {
        lastQueuedMessage = message;
        this.messageQueue.push(message);
      } else {
        speakMessage(message, false).then(speakNextMessage).catch(console.log);
      }
    },
    SpeakNow: async function (text, username, ssmlTextType, voice) {
      //console.log("Speaking: " + text + " -- with voice: " + voice);
      //If currently speaking a message, add new message to the messageQueue
      isSpeaking = true;
      let message = {};
      message.text = text;
      message.username = username;
      message.voice = voice;
      message.ssmlTextType = ssmlTextType;
      await speakMessage(message, true)
        .then(speakNextMessage)
        .catch(console.log);
    },
    SpeakNext: async function (text, username, ssmlTextType, voice, mID) {
      //console.log("Speaking: " + text + " -- with voice: " + voice);
      //If currently speaking a message, add new message to the messageQueue
      let message = {};
      message.text = text;
      message.username = username;
      message.voice = voice;
      message.ssmlTextType = ssmlTextType;
      message.messageID = mID;

      if (isSpeaking) {
        lastQueuedMessage = message;
        this.messageQueue.unshift(message);
      } else {
        speakMessage(message, false).then(speakNextMessage).catch(console.log);
      }
    },
    Pause: async function () {
      audioPlayer.pause();
      isPaused = true;
    },
    Continue: async function () {
      audioPlayer.play();
      isPaused = false;
      speakNextMessage();
    },
    Skip: async function () {
      audioPlayer.pause();
      const event = new Event("skip");
      audioPlayer.dispatchEvent(event);
      isSpeaking = false;
      speakNextMessage();
    },
    Dump: async function () {
      this.messageQueue = [];
      const event = new Event("skip");
      audioPlayer.dispatchEvent(event);
      isSpeaking = false;
    },
    PopLastMessage: async function (username) {
      for (var i = this.messageQueue.length - 1; i >= 0; i--) {
        if (username == this.messageQueue[i].username) {
          this.messageQueue.splice(i, 1);
          break;
        }
      }
    },
    PopAndGoFast: async function (username) {
      for (var i = this.messageQueue.length - 1; i >= 0; i--) {
        if (username == this.messageQueue[i].username) {
          this.messageQueue.splice(i, 1);
          break;
        }
      }
    },
    DumpByUser: async function (username) {
      this.messageQueue = this.messageQueue.filter(function (element) {
        return element.username != username;
      });
      const event = new Event("skip");
      audioPlayer.dispatchEvent(event);
      isSpeaking = false;
      speakNextMessage();
    },
    Ban: async function () {
      banMessage = currentSpokenMessage;
      audioPlayer.pause();

      let message = "Ban " + banMessage.username + "?";

      addSystemBubble(message, ++messageID);
      window.audioPlayer.SpeakNext(
        //"<speak>" + getSpokenName(document.getElementById("twitch_username").value) + " says " + text + "</speak>",
        message,
        "system",
        "text",
        messageID
      );
      currentSpokenMessage.banInitiated = true;
      banMessage.banInitiated = true;
    },
    BanConfirm: async function () {
      //console.log("BanConfirmed:", currentSpokenMessage, " channel:", con.channel);
      if (banMessage.banInitiated) {
        console.log("BanConfirmed:", banMessage, " channel:", con.channel);
        this.DumpByUser(banMessage.username);
        ttsBanByUser(con.channel, banMessage.username);
        window.audioPlayer.SpeakNow(
          //"<speak>" + getSpokenName(document.getElementById("twitch_username").value) + " says " + text + "</speak>",
          "Banned" + banMessage.username + ", hasta la vista, baby",
          "system",
          "text"
        );
        const event = new Event("skip");
        audioPlayer.dispatchEvent(event);
        isSpeaking = false;
        speakNextMessage();
        banMessage = {};
      }
    },
    BanCancel: async function () {
      if (banMessage.banInitiated) {
        let message = "You dodged a bullet there " + banMessage.username;
        addSystemBubble(message, ++messageID);
        window.audioPlayer.SpeakNext(
          //"<speak>" + getSpokenName(document.getElementById("twitch_username").value) + " says " + text + "</speak>",
          message,
          "system",
          "text",
          messageID
        );
        banMessage = {};

        //audioPlayer.play();
      }
    },
    BanConfirmLulz: async function () {
      //console.log("BanConfirmed:", currentSpokenMessage, " channel:", con.channel);
      if (banMessage.banInitiated) {
        isSpeaking = true;
        console.log("BanConfirmed:", banMessage, " channel:", con.channel);
        await this.DumpByUser(banMessage.username);
        await window.audioPlayer.SpeakNow(
          //"<speak>" + getSpokenName(document.getElementById("twitch_username").value) + " says " + text + "</speak>",
          '<speak>Get the <say-as interpret-as="expletive">fudge</say-as> out of here ' +
            banMessage.username +
            "</speak>",
          "system",
          "ssml"
        );

        var user = banMessage.username;
        ttsBanByUser(con.channel, user);

        setTimeout(function () {
          window.audioPlayer.SpeakNow(
            //"<speak>" + getSpokenName(document.getElementById("twitch_username").value) + " says " + text + "</speak>",
            "<speak>Just kidding " +
              user +
              ", we love you get back in here.</speak>",
            "system",
            "ssml"
          );
          ttsUnbanByUser(con.channel, user);
        }, 10000);

        isSpeaking = false;
        speakNextMessage();
        //
        banMessage = {};
      } else {
        console.log(
          "BanConfirmed: ban not initiated",
          currentSpokenMessage,
          " channel:",
          con.channel
        );
        //audioPlayer.play();
      }
    },
  };

  // Speak text message
  async function speakMessage(message, immediate) {
    isSpeaking = true;
    if (!immediate) {
      currentSpokenMessage = message;
    }

    var prefix = {};
    var suffix = {};

    let originalBackground;
    let messageElement;

    if (message.messageID > 0) {
      messageElement = document.getElementById(
        "message-user-id" + message.messageID
      );
      originalBackground = messageElement.style.backgroundColor;
      messageElement.style.backgroundColor = "green";
    }

    try {
      if (message.prefix) {
        prefix.text = message.prefix;
        prefix.username = "system";
        prefix.ssmlTextType = "ssml";
        prefix.messageID = message.messageID;
        await getPollyAudioStream(prefix).then(playAudioStream);
      }
    } catch (err) {
      console.log("speak prefix: catch(" + err + ")");
    }

    if (message.messageID > 0) {
      messageElement.style.backgroundColor = originalBackground;
      messageElement = document.getElementById(
        "message-message-id" + message.messageID
      );
      originalBackground = messageElement.style.backgroundColor;
      messageElement.style.backgroundColor = "green";
    }

    let usefx = false;

    try {
      // /(.*?)?\s(?:with)?\s?([PU]\d+)(?:\s([PU]\d+))?(?:\s([PU]\d+))?(?:\s([PU]\d+))?/i
      // /(.*?)(?:\s+with)?\s+([pu]\d{1,3})$/i
      let match = message.text.match(
        /(.+?)(?:\swith)?\s(?:([pu]\d{1,3})\s?)(?:([pu]\d{1,3})\s?)?(?:([pu]\d{1,3})\s?)?(?:([pu]\d{1,3})\s?)?$/i
      );

      if (match && match[1]) {
        let presetCount = 1;
        usefx = true;
        message.text = match[1];

        let wsObject = {
          topic: "ttsfx",
          action: "fxSelect",
          time: Date.now(),
        };

        if (match[2]) {
          wsObject.preset1 = match[2].toLowerCase();
        }
        if (match[3]) {
          wsObject.preset2 = match[3].toLowerCase();
          presetCount++;
        }
        if (match[4]) {
          wsObject.preset3 = match[4].toLowerCase();
          presetCount++;
        }
        if (match[5]) {
          wsObject.preset4 = match[5].toLowerCase();
          presetCount++;
        }

        wsObject.presetCount = presetCount;

        websocketCustom.send(JSON.stringify(wsObject));
      }
    } catch (err) {
      console.log("send midi fxSelect: catch(" + err + ")");
    }

    await sleep(300);

    try {
      // Speak main part of message
      await getPollyAudioStream(message).then(playAudioStream);
    } catch (err) {
      console.log("speak main text: catch(" + err + ")");
    }

    try {
      if (usefx) {
        let wsObject = {
          topic: "ttsfx",
          action: "fxStop",
          time: Date.now(),
        };
        await sleep(1000);
        websocketCustom.send(JSON.stringify(wsObject));
      }
    } catch (err) {
      console.log("send midi fxStop: catch(" + err + ")");
    }

    try {
      if (message.suffix) {
        suffix.text = message.suffix;
        suffix.username = "system";
        suffix.ssmlTextType = "text";
        await getPollyAudioStream(suffix).then(playAudioStream);
      }
    } catch (err) {
      console.log("speak suffix catch: catch(" + err + ")");
    }

    if (message.messageID > 0) {
      messageElement.style.backgroundColor = originalBackground;
      messageElement = document.getElementById(
        "message-user-id" + message.messageID
      );
      messageElement.style.backgroundColor = "black";
      messageElement = document.getElementById(
        "message-message-id" + message.messageID
      );
      messageElement.style.backgroundColor = "black";
    }

    isSpeaking = false;
  }

  function sleep(duration) {
    return new Promise((resolve) => setTimeout(resolve, duration));
  }

  // Speak next message in the list
  function speakNextMessage() {
    if (!streamerIsSpeaking && !isSpeaking && !isPaused) {
      var queue = speaker.messageQueue;
      if (queue.length > 0) {
        var nextMessage = queue[0];
        queue.splice(0, 1);
        speakMessage(nextMessage).then(speakNextMessage).catch(console.log);
      }
    }
  }

  // Get synthesized speech from Amazon polly
  async function getPollyAudioStream(message) {
    //console.log("getPollyAudioStream:");
    //console.log(message);
    //console.trace();
    return new Promise(function (resolve, reject) {
      var polly = new AWS.Polly();

      var voice = "ivy";
      if (
        chatters[message.username] &&
        chatters[message.username].hasOwnProperty("voice")
      ) {
        voice = chatters[message.username].voice;
      }
      //console.log('voice: ' + voice);

      var engine = "standard";
      //console.log("Chatters:");
      //console.log(chatters);
      //console.log("Voices:");
      //console.log(voices);
      if (
        chatters[message.username] &&
        chatters[message.username].hasOwnProperty("voice_option")
      ) {
        engine = chatters[message.username].voice_option;
      } else {
        engine = voices[voice].voiceOptions[0];
      }

      if (message.username == "system") {
        voice = document.getElementById("systemVoice").value;
        engine = document.getElementById("systemVoiceOption").value;
        //messageElement = document.getElementById("message-system-voice-id" + message.messageID);
        //messageElement.innerHTML = `${voice} (${engine})`;
      } else if (message.username == "custom") {
        voice = message.voice.toLowerCase();
        engine = voices[voice].voiceOptions[0];
      } else {
        voice = voices[voice].name;
      }

      voice = voices[voice.toLocaleLowerCase()].name;

      var params = {
        OutputFormat: "mp3",
        Engine: engine,
        TextType: message.ssmlTextType,
        Text: message.text,
        VoiceId: voice,
      };
      //console.log('Speaking with:', params);

      polly.synthesizeSpeech(params, function (err, data) {
        if (err) {
          data = {};
          data.AudioStream = new Uint8Array(ssml_error);
        }
        resolve(data.AudioStream);
      });
    });
  }

  // Play audio stream
  function playAudioStream(audioStream) {
    //isSpeaking = true;
    return new Promise(function (resolve, reject) {
      //console.log(audioStream);
      //var uInt8Array = new Uint8Array(audioStream);
      var arrayBuffer = audioStream.buffer;
      var blob = new Blob([arrayBuffer]);
      var url = URL.createObjectURL(blob);
      audioPlayer.src = url;

      audioPlayer.addEventListener("ended", onEnded);
      audioPlayer.addEventListener("skip", onEnded);

      function onEnded() {
        //("onEnded:", arguments);
        audioPlayer.pause();
        audioPlayer.removeEventListener("ended", onEnded);
        audioPlayer.removeEventListener("skip", onEnded);

        // STOP MIDI FX

        resolve();
      }

      audioPlayer.play().catch(function (error) {
        console.log("audioPlayer error: " + JSON.stringify(error));
        reject(error);
      });
    });
  }

  /**************************Voice Recognition****************************/
  function vr_function() {
    if (
      document.getElementById("cbPauseTTSOnSpeech").checked ||
      document.getElementById("cbSendTextToWebsocket").checked
    ) {
      window.SpeechRecognition =
        window.SpeechRecognition || webkitSpeechRecognition;

      var recognition = new webkitSpeechRecognition();
      var speechStarted = Date.now();

      recognition.interimResults = true;
      recognition.continuous = true;

      //recognition.onspeechstart = function () {
      //  console.log("recognition.onspeechstart()");
      //};

      recognition.onend = function () {
        //console.log("recognition.onend()");
        justWaitAMoment();
        streamerLastSpoke = Date.now();
        vr_function();
      };

      var trans_sourcelang = document.getElementById("dstLangSelect").value;
      var trans_destlang = document.getElementById("systemLangSelect").value;

      var gas_key =
        "AKfycbwi_joFMoaC8-kiSnvNiIfUqABbVar5Mg0g2nxu2BxuPkQiHJ5WwzYAFg";
      var TRANS_URL = "https://script.google.com/macros/s/" + gas_key + "/exec";
      var query = "";
      var request = new XMLHttpRequest();

      recognition.onresult = async function (event) {
        if (
          !document.getElementById("cbSTTS").checked &&
          !document.getElementById("cbSendTextToWebsocket").checked
        ) {
          return;
        }
        //console.log('recognition.onresult()');
        var results = event.results;
        var speechProcessingStart = window.performance.now();

        //sendEventToCCT(event);

        for (var i = event.resultIndex; i < results.length; i++) {
          var text = results[i][0].transcript.trim();
          var confidence = results[i][0].confidence;

          if (results[i].isFinal) {
            runVoiceCommand(text);

            //console.log("final spoke for:", Date.now() - speechStarted);
            //console.log("speechTimeQueue:", speechTimeQueue);
            sendTextToCustomWebsocket(
              text,
              true,
              speechStarted,
              Date.now(),
              confidence
            );

            sendTextToAWSWebsocket(
              text,
              true,
              speechStarted,
              Date.now(),
              confidence
            );

            if (!document.getElementById("cbSTTS").checked) {
              return;
            }
            // If source and dest lang match don't translate just speak
            if (trans_sourcelang == trans_destlang) {
              if (
                document.getElementById("cbSendDictationTranslation").checked
              ) {
                sendVoiceMessage(text);
              }
              addSystemBubble(text, ++messageID);
              window.audioPlayer.Speak(
                "",
                //"<speak>" + getSpokenName(document.getElementById("twitch_username").value) + " says " + text + "</speak>",
                text,
                "",
                "system",
                "text",
                messageID
              );
            } else {
              if (gas_key != null) {
                query =
                  TRANS_URL +
                  "?message=" +
                  results[i][0].transcript +
                  "&srcLang=" +
                  trans_sourcelang +
                  "&dstLang=" +
                  trans_destlang;
                request.open("GET", query, true);

                request.onreadystatechange = function () {
                  if (request.readyState === 4 && request.status === 200) {
                    //document.getElementById('speech_text-imb').innerHTML = recog_text;
                    //document.getElementById('trans_text-imb').innerHTML = request.responseText;
                    //window.audioPlayer.Speak("<speak>" + getSpokenName(document.getElementById("twitch_username").value) + " says </speak>", 'system', 'ssml');
                    if (
                      document.getElementById("cbSendDictationTranslation")
                        .checked
                    ) {
                      sendVoiceMessage(
                        text +
                          " ( " +
                          request.responseText +
                          " ) confidence: " +
                          confidence
                      );
                    }
                    addSystemBubble(text, ++messageID);
                    window.audioPlayer.Speak(
                      "",
                      request.responseText,
                      "",
                      "system",
                      "text",
                      messageID
                    );

                    //window.audioPlayer.Speak(" translated from english.", 'system', 'text');
                  }
                };
                request.send(null);
              }
            }
          } else {
            speechStarted = Date.now();
            streamerSpeaking(true);
            streamerLastSpoke = Date.now();

            //console.log("interim now():", Date.now());
            runImmediateVoiceCommand(text);

            if (!document.getElementById("cbUseFinalResultsOnly").checked) {
              sendTextToAWSWebsocket(
                text,
                false,
                speechStarted,
                Date.now(),
                confidence
              );
            }

            sendTextToCustomWebsocket(text, false, speechStarted, Date.now());
          }
        }

        //console.log("processed results, wait to enable tts again");
        justWaitAMoment();

        streamerLastSpoke = Date.now();

        //var time_diff = window.performance.now() - speechProcessingStart;
        //console.log("Speech processing took:", time_diff, "ms");
        //console.log("Speech processing took:", parseFloat(time_diff).toFixed(6), "ms");
      };

      recognition.start();
    } else {
      console.log("Pause TTS on speech disabled");
    }
  }

  function sendTextToCCTPopup(text, isFinal) {
    if (window.cctPopup != null && !window.cctPopup.closed) {
      //var lblFirstName = cctPopup.document.getElementById("lblFirstName");
      //var lblLastName = cctPopup.document.getElementById("lblLastName");
      //lblFirstName.innerHTML = document.getElementById("txtFirstName").value;
      //lblLastName.innerHTML = document.getElementById("txtLastName").value;
      window.cctPopup.focus();
    }
  }

  function sendTextToAWSWebsocket(
    text,
    isFinal,
    speechStarted,
    speechEnded,
    confidence
  ) {
    if (
      document.getElementById("cbSendTextToAWSWebsocket").checked &&
      websocketProd &&
      websocketProd.readyState === WebSocket.OPEN
    ) {
      var wsObject = {
        action: "sendmessage",
        channel: con.channel,
        message: text,
        started: speechStarted,
        finished: speechEnded,
        confidence: confidence,
        time: Date.now(),
        isFinal: isFinal,
      };
      //console.log("sendTextToAWSWebsocket():", wsObject);
      websocketProd.send(JSON.stringify(wsObject));
    }
  }

  function sendTextToCustomWebsocket(
    text,
    isFinal,
    speechStarted,
    speechEnded,
    confidence
  ) {
    if (
      document.getElementById("cbSendTextToWebsocket").checked &&
      websocketCustom &&
      websocketCustom.readyState === WebSocket.OPEN
    ) {
      var wsObject = {
        action: "spokenText",
        text: text,
        started: speechStarted,
        finished: speechEnded,
        confidence: confidence,
        time: Date.now(),
        isFinal: isFinal,
      };
      //console.log("sendTextToCustomWebsocket():", wsObject);
      //if (isFinal)
      websocketCustom.send(JSON.stringify(wsObject));
    }
  }

  function runImmediateVoiceCommand(text) {
    if (
      document.getElementById("cbPoofMessage").checked &&
      text.match(document.getElementById("txtPoofRegex").value)
    ) {
      console.log("poof");
      window.audioPlayer.Skip();
    } else if (text.toLowerCase().includes("wrap it up")) {
      window.audioPlayer.PopAndGoFast();
    }
  }

  function runVoiceCommand(text) {
    if (text.toLowerCase().includes("tts pause")) {
      window.audioPlayer.Pause();
    } else if (
      document.getElementById("cbBanHammer").checked &&
      text.match(document.getElementById("txtBanRegex").value)
    ) {
      console.log("ban");
      window.audioPlayer.Ban();
    } else if (
      document.getElementById("cbBanHammer").checked &&
      text.match(document.getElementById("txtBanConfirmRegex").value)
    ) {
      console.log("ban confirm");
      window.audioPlayer.BanConfirm();
    } else if (
      text.toLowerCase().includes("for the laws") ||
      text.toLowerCase().includes("for the lulz") ||
      text.toLowerCase().includes("for the lols") ||
      text.toLowerCase().includes("why not")
    ) {
      console.log("ban confirm lulz");
      window.audioPlayer.BanConfirmLulz();
    } else if (text.toLowerCase().includes("no")) {
      window.audioPlayer.BanCancel();
    } else if (text.toLowerCase().includes("tts continue")) {
      window.audioPlayer.Continue();
    } else if (
      text.toLowerCase().includes("tts dump") ||
      text.toLowerCase().includes("tds dump")
    ) {
      window.audioPlayer.Dump();
    }
  }

  function justWaitAMoment() {
    if (!waitingAMoment) {
      waitingAMoment = true;
      waitingIntervalID = setInterval(function () {
        justWaitAMoment();
      }, 500);
      //console.log("waitingIntervalID=", waitingIntervalID);
    }

    let waitTimeMS = document.getElementById("txtTTSWaitTime").value * 1000;
    var lastSpokeDiff = Date.now() - streamerLastSpoke;
    //console.log("Last spoke diff: " + lastSpokeDiff);
    //console.log("moments to wait: " + waitTimeMS);
    if (lastSpokeDiff >= waitTimeMS) {
      clearInterval(waitingIntervalID);
      waitingAMoment = false;
      streamerSpeaking(false);
      //console.log("RELEASE THE KRAKEN!!!!!");
      speakNextMessage();
      return;
    }
  }

  function streamerSpeaking(speaking) {
    if (speaking) {
      streamerIsSpeaking = true;
      if (!window.audioPlayer.isPaused())
        document.getElementById("title").innerHTML = "🔇TTS Waiting";
    } else {
      streamerIsSpeaking = false;
      if (!window.audioPlayer.isPaused())
        document.getElementById("title").innerHTML = "🔊TTS Enabled";
    }
  }

  return speaker;
}
/**************************Audio player****************************/

(async function () {
  // Create a CognitoIdentity service object
  const cognitoIdentity = new AWS.CognitoIdentity();

  // Get a Cognito Identity ID
  await cognitoIdentity.getId(
    {
      IdentityPoolId: "us-west-2:74292e8b-5888-4e9c-930d-a6379a9a4398",
    },
    async (err, data) => {
      if (err) {
        console.error("Error getting Cognito Identity ID", err);
        return;
      }

      // Configure the Identity Pool ID and the Identity ID
      AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: "us-west-2:74292e8b-5888-4e9c-930d-a6379a9a4398",
        IdentityId: data.IdentityId,
      });

      // Get the temporary AWS credentials
      await AWS.config.credentials.get((error) => {
        if (error) {
          console.error("Error getting credentials", error);
        } else {
          let ep = new AWS.Endpoint("translate.us-west-2.amazonaws.com");
          window.translator = new AWS.Translate({
            endpoint: ep,
            region: AWS.config.region,
          });

          finishSetup();

          console.log(
            "Successfully authenticated as an unauthenticated user with Cognito"
          );
        }
      });
    }
  );
})();

async function finishSetup() {
  //console.log('final load function()');
  await buildVoiceLookup();
  loadAndSortLanguages();

  Handlebars.registerHelper("contains", function (needle, haystack, options) {
    //needle = Handlebars.escapeExpression(needle);
    //haystack = Handlebars.escapeExpression(haystack);
    return haystack.indexOf(needle) > -1
      ? options.fn(this)
      : options.inverse(this);
  });

  Handlebars.registerHelper("select", function (value, options) {
    var $el = $("<select />").html(options.fn(this));
    $el.find('[value="' + value + '"]').attr({ selected: "selected" });
    return $el.html();
  });

  var data = {};

  if (localStorage.getItem("systemVoice")) {
    data.voice = localStorage.getItem("systemVoice");
  } else {
    data.voice = "Justin";
  }

  data.voices = voicesDesc;

  var systemVoiceSource = document.getElementById(
      "system-voice-template"
    ).innerHTML,
    systemVoiceTemplate = Handlebars.compile(systemVoiceSource),
    systemVoicePlaceholder = document.getElementById("systemVoicePlaceholder");

  systemVoicePlaceholder.innerHTML = systemVoiceTemplate(data);

  var systemVoiceOptionSource = document.getElementById(
      "system-voice-option-template"
    ).innerHTML,
    systemVoiceOptionTemplate = Handlebars.compile(systemVoiceOptionSource),
    systemVoiceOptionPlaceholder = document.getElementById(
      "systemVoiceOptionPlaceholder"
    );

  var optionData = {};

  optionData.voiceOptions = voices[data.voice.toLowerCase()].voiceOptions;
  optionData.voiceOption = voices[data.voice.toLowerCase()].voiceOptions[0];

  systemVoiceOptionPlaceholder.innerHTML =
    systemVoiceOptionTemplate(optionData);

  if (localStorage.getItem("systemVoice")) {
    document.getElementById("systemVoice").value =
      localStorage.getItem("systemVoice");
  }
  if (localStorage.getItem("systemVoiceOption")) {
    document.getElementById("systemVoiceOption").value =
      localStorage.getItem("systemVoiceOption");
  }

  var srcLangSource = document.getElementById("lang-template").innerHTML,
    srcLangTemplate = Handlebars.compile(srcLangSource),
    srcLangPlaceholder = document.getElementById("srcLangPlaceholder");

  data = {};
  data.name =
    "Source Language Selection: (Keep auto unless you only want to translate only from one language) ";
  data.elementId = "srcLangSelect";
  data.langs = sortedLanguages;
  srcLangPlaceholder.innerHTML = srcLangTemplate(data);

  var dstLangSource = document.getElementById("lang-template").innerHTML,
    dstLangTemplate = Handlebars.compile(dstLangSource),
    dstLangPlaceholder = document.getElementById("dstLangPlaceholder");

  data.name = "Dest Language Selection: (Language to translate to) ";
  data.elementId = "dstLangSelect";
  dstLangPlaceholder.innerHTML = dstLangTemplate(data);

  var chatLangSource = document.getElementById("lang-template").innerHTML,
    chatLangTemplate = Handlebars.compile(chatLangSource),
    chatLangPlaceholder = document.getElementById("chatLangPlaceholder");

  data.name = "";
  data.elementId = "chatLangSelect";
  chatLangPlaceholder.innerHTML = chatLangTemplate(data);

  var systemLangSource = document.getElementById("lang-template").innerHTML,
    systemLangTemplate = Handlebars.compile(systemLangSource),
    systemLangPlaceholder = document.getElementById("systemLangPlaceholder");

  data.name = "System";
  data.elementId = "systemLangSelect";
  systemLangPlaceholder.innerHTML = systemLangTemplate(data);

  if (localStorage.getItem("srcLangSelect")) {
    document.getElementById("srcLangSelect").value =
      localStorage.getItem("srcLangSelect");
  } else {
    document.getElementById("srcLangSelect").value = "auto";
  }

  if (localStorage.getItem("dstLangSelect")) {
    document.getElementById("dstLangSelect").value =
      localStorage.getItem("dstLangSelect");
  } else {
    document.getElementById("dstLangSelect").value = "en";
  }
  if (localStorage.getItem("chatLangSelect")) {
    document.getElementById("chatLangSelect").value =
      localStorage.getItem("chatLangSelect");
  }
  if (localStorage.getItem("systemLangSelect")) {
    document.getElementById("systemLangSelect").value =
      localStorage.getItem("systemLangSelect");
  }

  if (access_token) {
    $("#login").hide();
    $("#ttsinfo").hide();
    $("#loggedin").show();
    if (autoconnect == "true") {
      connect();
    }
  } else {
    showAuthButton();
  }
}
