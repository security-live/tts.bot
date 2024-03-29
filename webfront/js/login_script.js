"use strict";

let voices = {};
let voicesDesc = {};
let sortedLanguages = [];
let voiceRecognitionSupport = false;

let redirectURL =
  "https://" +
  location.hostname +
  "/safetokenXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.html";

// URLs for the Twitch authentication
let twitchURLMinimalPermissions =
  "https://id.twitch.tv/oauth2/authorize?client_id=dan71ek0pct1u7b8ht5u4h55zlcxvq&redirect_uri=" +
  redirectURL +
  "&response_type=token&scope=moderation:read+moderator:manage:shoutouts+whispers:read+whispers:edit+user:manage:whispers+chat:read+chat:edit";

let twitchURLFullPermissions =
  "https://id.twitch.tv/oauth2/authorize?client_id=dan71ek0pct1u7b8ht5u4h55zlcxvq&redirect_uri=" +
  redirectURL +
  "&response_type=token&scope=moderation:read+moderator:manage:shoutouts+whispers:read+whispers:edit+user:manage:whispers+chat:read+chat:edit+moderator:manage:banned_users+moderator:manage:chat_messages+channel:manage:moderators";

async function finishSetup() {
  console.log("final load function()");
  await buildVoiceLookup();

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
    data.voice = "Gregory";
  }

  data.voices = voicesDesc;

  // System voice -------------------------------------------------------------

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

  //if(!document.getElementById("systemVoiceOption").value) {
  //  document.getElementById("systemVoiceOption").setItem()
  //}

  // ------------------------------------------------------------
  // Default chatter voice

  if (localStorage.getItem("defaultChatterVoice")) {
    data.voice = localStorage.getItem("defaultChatterVoice");
  } else {
    data.voice = "Justin";
  }

  var defaultChatterVoiceSource = document.getElementById(
      "default-chatter-voice-template"
    ).innerHTML,
    defaultChatterVoiceTemplate = Handlebars.compile(defaultChatterVoiceSource),
    defaultChatterVoicePlaceholder = document.getElementById(
      "defaultChatterVoicePlaceholder"
    );

  defaultChatterVoicePlaceholder.innerHTML = defaultChatterVoiceTemplate(data);

  var defaultChatterVoiceOptionSource = document.getElementById(
      "default-chatter-voice-option-template"
    ).innerHTML,
    defaultChatterVoiceOptionTemplate = Handlebars.compile(
      defaultChatterVoiceOptionSource
    ),
    defaultChatterVoiceOptionPlaceholder = document.getElementById(
      "defaultChatterVoiceOptionPlaceholder"
    );

  var optionData = {};

  optionData.voiceOptions = voices[data.voice.toLowerCase()].voiceOptions;
  optionData.voiceOption = voices[data.voice.toLowerCase()].voiceOptions[0];

  defaultChatterVoiceOptionPlaceholder.innerHTML =
    defaultChatterVoiceOptionTemplate(optionData);

  if (localStorage.getItem("defaultChatterVoice")) {
    document.getElementById("defaultChatterVoice").value = localStorage.getItem(
      "defaultChatterVoice"
    );
  }
  if (localStorage.getItem("defaultChatterVoiceOption")) {
    document.getElementById("defaultChatterVoiceOption").value =
      localStorage.getItem("defaultChatterVoiceOption");
  }

  // ------------------------------------------------------------------------

  data = {};
  data.name = "Choose your language.";
  data.elementId = "dstLangSelect";
  data.langs = supportedLanguages;

  var dstLangSource = document.getElementById("system-lang-template").innerHTML,
    dstLangTemplate = Handlebars.compile(dstLangSource),
    dstLangPlaceholder = document.getElementById("dstLangPlaceholder");

  dstLangPlaceholder.innerHTML = dstLangTemplate(data);

  if (localStorage.getItem("dstLangSelect")) {
    document.getElementById("dstLangSelect").value =
      localStorage.getItem("dstLangSelect");
  } else {
    document.getElementById("dstLangSelect").value = getUserLanguage();
    console.log("User language:", getUserLanguage());
    saveLocalStorageLang("dstLangSelect");
  }

  modcap();
}

function getUserLanguage() {
  var language = navigator.language || navigator.userLanguage;
  return language.substring(0, 2);
}

function saveSettings() {
  localStorage.setItem(
    "dstLangSelect",
    document.getElementById("dstLangSelect").value
  );

  localStorage.setItem(
    "systemVoice",
    document.getElementById("systemVoice").value
  );

  localStorage.setItem(
    "systemVoiceOption",
    document.getElementById("systemVoiceOption").value
  );

  localStorage.setItem(
    "defaultChatterVoice",
    document.getElementById("defaultChatterVoice").value
  );

  localStorage.setItem(
    "defaultChatterVoiceOption",
    document.getElementById("defaultChatterVoiceOption").value
  );
}

// Function for basic capabilities
function basiccap() {
  var loginButton = document.getElementById("loginButton");
  loginButton.onclick = function () {
    saveSettings();
    window.location.href = twitchURLMinimalPermissions;
  };
  //loginButton.textContent = "Authorize On Twitch with minimal permissions";
}

// Function for moderator capabilities
function modcap() {
  var loginButton = document.getElementById("loginButton");
  loginButton.onclick = function () {
    saveSettings();
    window.location.href = twitchURLFullPermissions;
  };
  //loginButton.textContent =
  // "Authorize On Twitch with ban and chat delete permissions";
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

function saveLocalStorageLang(elementId) {
  console.log("elementId:", elementId);
  localStorage.setItem(elementId, document.getElementById(elementId).value);

  let systemVoiceSelect = document.getElementById("systemVoice");
  let defaultChatterVoiceSelect = document.getElementById(
    "defaultChatterVoice"
  );

  systemVoiceSelect.value = selectRandomVoiceByLanguageCode(
    document.getElementById(elementId).value
  ).Id;
  systemVoiceSelected(systemVoiceSelect.value);

  defaultChatterVoiceSelect.value = selectRandomVoiceByLanguageCode(
    document.getElementById(elementId).value
  ).Id;
  defaultChatterVoiceSelected(defaultChatterVoiceSelect.value);
}

function selectRandomVoiceByLanguageCode(languageCode) {
  // Filter voices by language code
  const matchingVoices = voicesDesc.Voices.filter((voice) =>
    voice.LanguageCode.startsWith(languageCode)
  );

  // Check if we found any matching voices
  if (matchingVoices.length === 0) {
    return { Id: "Justin" };
  }

  // Select a random voice from the matching ones
  const randomIndex = Math.floor(Math.random() * matchingVoices.length);
  return matchingVoices[randomIndex];
}

function systemVoiceSelected(voice) {
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
  var voiceOption = document.getElementById("system-voice-option");
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

function systemVoiceOptionSelected(voiceOption) {
  var voiceOptionElement = document.getElementById("system-voice-option");
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

function defaultChatterVoiceSelected(voice) {
  var userVoiceOptionSource = document.getElementById(
      "default-chatter-voice-option-template"
    ).innerHTML,
    userVoiceOptionTemplate = Handlebars.compile(userVoiceOptionSource),
    userVoiceOptionPlaceholder = document.getElementById(
      "defaultChatterVoiceOptionPlaceholder"
    );
  userVoiceOptionPlaceholder.innerHTML = userVoiceOptionTemplate(
    voices[voice.toLowerCase()]
  );
  var voiceOption = document.getElementById("default-chatter-voice-option");
  voiceOption.value = voices[voice.toLowerCase()].voiceOptions[0];

  localStorage.setItem(
    "defaultChatterVoice",
    document.getElementById("defaultChatterVoice").value
  );
  localStorage.setItem(
    "defaultChatterVoiceOption",
    document.getElementById("defaultChatterVoiceOption").value
  );
}

function defaultChatterVoiceOptionSelected(voiceOption) {
  var voiceOptionElement = document.getElementById(
    "default-chatter-voice-option"
  );
  voiceOptionElement.value = voiceOption;

  localStorage.setItem(
    "defaultChatterVoice",
    document.getElementById("defaultChatterVoice").value
  );
  localStorage.setItem(
    "defaultChatterVoiceOption",
    document.getElementById("defaultChatterVoiceOption").value
  );
}

function isChrome() {
  var userAgent = navigator.userAgent;
  var isChrome = userAgent.includes("Chrome") || userAgent.includes("CriOS"); // CriOS is for Chrome on iOS
  var isEdge = userAgent.includes("Edg"); // Note: Old Edge does not include "Edg", but the old Edge is based on EdgeHTML, not Chromium.

  return isChrome && !isEdge;
}

function testVR() {
  let recognition = new webkitSpeechRecognition();
  recognition.continuous = true; // Recognize continuously
  recognition.interimResults = true; // Allows results to be returned before the user has finished speaking

  recognition.onstart = () => {
    console.log("Voice recognition started. Speak into the microphone.");
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    console.log(transcript); // Process the results here
    //document.getElementById('output').innerText = transcript;
  };

  recognition.start();
}


(async function () {
  // Create a CognitoIdentity service object
  AWS.config.region = "us-west-2";
  const cognitoIdentity = new AWS.CognitoIdentity();

  // Get a Cognito Identity ID
  await cognitoIdentity.getId(
    {
      IdentityPoolId: "us-west-2:906a8430-e48a-4084-9513-dcf502e5e58a",
      //IdentityPoolId: "us-west-2:74292e8b-5888-4e9c-930d-a6379a9a4398",
    },
    async (err, data) => {
      if (err) {
        console.error("Error getting Cognito Identity ID", err);
        return;
      }

      // Configure the Identity Pool ID and the Identity ID
      AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: "us-west-2:906a8430-e48a-4084-9513-dcf502e5e58a",
        //IdentityPoolId: "us-west-2:74292e8b-5888-4e9c-930d-a6379a9a4398",
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

  if ("webkitSpeechRecognition" in window) {
    // Speech Recognition is supported, proceed with the logic
    voiceRecognitionSupport = true;
    var recognition = new webkitSpeechRecognition();
    let vrOptions = document.getElementById("vrOptions");
    let cbEnableVR = document.getElementById("cbVoiceRecognition");
    if(isChrome()) {
      vrOptions.style.display = "block";
    }

    var testVRButton = document.getElementById("testVR");
    testVRButton.onclick = function () {
      testVR();
    };

    // Do your speech recognition set up here
  } else {
    // Speech Recognition not supported
    // Here, you can either fall back to another technique or inform the user
    alert(
      "Your browser does not support speech recognition. Please use Google Chrome for voice recognition."
    );
  }

})();

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
