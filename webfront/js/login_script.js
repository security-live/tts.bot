let voices = {};
let voicesDesc = {};
let sortedLanguages = [];

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
})();

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
    document.getElementById("dstLangSelect").value = "en";
  }

  /*
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
    */
}

// Function for basic capabilities
function basiccap() {
  var loginButton = document.getElementById("loginButton");
  loginButton.onclick = function () {
    window.location.href = twitchURLMinimalPermissions;
  };
  //loginButton.textContent = "Authorize On Twitch with minimal permissions";
}

// Function for moderator capabilities
function modcap() {
  var loginButton = document.getElementById("loginButton");
  loginButton.onclick = function () {
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

function saveLocalStorageLang(elementId) {
  console.log("elementId:", elementId);
  localStorage.setItem(elementId, document.getElementById(elementId).value);
  selectRandomVoiceByLanguageCode(document.getElementById(elementId).value);
}

function selectRandomVoiceByLanguageCode(languageCode) {
  // Filter voices by language code
  const matchingVoices = voicesDesc.Voices.filter((voice) =>
    voice.LanguageCode.startsWith(languageCode)
  );

  // Check if we found any matching voices
  if (matchingVoices.length === 0) {
    return null;
  }

  // Select a random voice from the matching ones
  const randomIndex = Math.floor(Math.random() * matchingVoices.length);
  document.getElementById("systemVoice").value = matchingVoices[randomIndex].Id;
  systemVoiceSelected(matchingVoices[randomIndex].Id);
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

function systemVoiceOptionSelected(voiceOption) {
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
