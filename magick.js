var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
var xhr;
var latestMarketChannelID;
var marketDataHeader;

//var request = new XMLHttpRequest();
//request.open("GET", "data/cards.json", function(data) {
//	const cards = JSON.parse(data)
//})
var cards = require('./data/cards.json')['cards']

//var testText = require('./testText.json')

var fs = require('fs');

//Config log settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {colorize: true});
logger.level = 'debug';

//for (var i = 0, len = cards.length; i < len; i++) {
//	logger.info('Read card ' + cards[i]['Name'])
//}

function slowFetch(namelookup) {
	var thisitem
	for (var i = 0, len = cards.length; i < len; i++) {
		thisitem = cards[i];
		//logger.info('This item: ' + thisitem.name);
		if (thisitem.name.toLowerCase() === namelookup.toLowerCase()) {
			return thisitem;
		}
	}
	return null;
}

//Initialize Discord Bot
var bot = new Discord.Client({token: auth.token, autorun: true});

//var attributeData = require('./attribData.json');

bot.on('ready', function(evt) {
	logger.info('Connected');
	logger.info('Logged in as: ');
	logger.info(bot.username + '-(' + bot.id + ')');
});

function find(thing, list) {
	for (var th in list) {
		if (list[th] == thing) {
			return true;
		}
	}
	return false;
}

function parseItemAttribute(card, attribute, single) {
	var mess = '';
	if (single) mess += '[' + card['Name'] + '] ';
	switch (attribute) {
		case 'Mana Cost':
			mess += '**Mana Cost**: ';
			var mana = card['Mana Cost'];
			mess += parseMana(mana) + '\n';
			break;
			
		case 'ImageName':
			break;
			
		default:
			logger.info('Fetching attribute ' + attribute);
			mess += '**'+ attribute + '**: ' + card[attribute] + '\n';
	}
	return mess;
}

function parseMana(mana) {
	var mess = '\n'
	var i = 0;
	var maxx = mana.length
	for (var thisMana in mana) {
		mess += '\t' + mana[thisMana] + " " + thisMana
		if (i < maxx) { mess += "\n" }
	}
	return mess
}

bot.on('message', function (user, userID, channelID, message, evt) {
	logger.info('Got message from channel ID ' + channelID);
	message = message.replace(/ +/g, ' ');
	if (bot.id != userID) {
		if (message[0] == '!') {
			var args = message.substring(1).split(' ');
			switch (args[0]) {
				case 'test':
					bot.sendMessage({
						to: channelID,
						embed: {
						  color: 0x63B697,
						  title: "Test",
						  fields: [
						  	{name: "Field 1",
						  	value: "Value 1",
						  	},
						  	{name: "Field 2",
						  	value: "Value 2",
						  	}
						  ]
					  }
					});
					break;
				default: //------------------------ TRY FOR SPECIFIC ATTRIBUTE ---------------------
					if (attributeData[args[0]] != undefined) {
						var testName = '';
						for (var cname in args) {
							if (cname > 0) {
								if (cname > 1) {
									testName += ' ';
								}
								testName += args[cname];
							}
						}
						logger.info('Parsed name [' + testName + ']');
						//var selectedItem = slowFetch(testName);
						var selectedItem = cards.find(element => (element['Name'].toLowerCase() == testName.toLowerCase()));
						if (selectedItem != null) {
							var mess = parseItemAttribute(selectedItem, args[0], true);
							if (mess != null) {
								if (mess.length <= 2000) {
									bot.sendMessage({
										to: channelID,
										message: mess
									});
								} else {
									bot.sendMessage({
										to: channelID,
										message: 'I\'m sorry, Tenno, but your requested information is too large (' + mess.length + ' characters). Try disabling drop tables (_!untrack drops_).'
									});
								}
							} else {
								logger.error('parseItemAttribute returned null!');
							}
						} else {
							bot.sendMessage({
								to: channelID,
								message: 'I don\'t recognize that card'
							});
						}
					} else {
						bot.sendMessage({
							to: channelID,
							message: 'I didn\'t understand that'
						});
					}
			}
		} else { //---------------------------- NO !COMMAND FOUND --------------------------
			var thingRegex = /\[[^\]]*\]/gi;
			var thingsArray = message.match(thingRegex);
			logger.info('Got message: ' + message);
			var failedNames = [];
			if (thingsArray == null) {
				logger.info('No pattern found in message');
			} else {
				logger.info('Regex returned: ' + thingsArray + ' (length ' + thingsArray.length + ')');
				var selectedItem = null;
				
				for (var currentThing in thingsArray) {
					selectedItem = null;
					if (thingsArray != null) {
						//var currentName = regexResult[0];
						logger.info('Current name: ' + thingsArray[currentThing]);
						var extractedThing = thingsArray[currentThing];
						var parsedName = extractedThing.substring(1, extractedThing.length - 1);
						logger.info('Parsed name: ' + parsedName);
						//var selectedItem = slowFetch(parsedName);
						var selectedItem = cards.find(element => (element['Name'].toLowerCase() == parsedName.toLowerCase()));
					} else {
						logger.info('No items in message!');
					}
					
					if (selectedItem != null) {
						logger.info('Found item ' + parsedName);
						var mess = "";
						for (var attribute in selectedItem) {
							//if (attributeData[attribute] != undefined) {
								//logger.info(attribute + ': ' + attributeData[attribute][0]['want']);
								//if (attributeData[attribute]['want'] == 1) {
									mess += parseItemAttribute(selectedItem, attribute, false);
								//} else {
									//logger.info('Unwanted attribute ' + attribute);
								//}
							//} else {
								//logger.warn('Incomplete list of attributes (' + attribute + ')');
							//}
						}
						if (mess != null) {
							logger.info('Sending message regarding ' + selectedItem['Name']);
							if (mess.length <= 2000) {
								//if (fs.existsSync('./node_modules/warframe-items/data/img/' + selectedItem.imageName)) {
								var path = './data/' + selectedItem['ImageName']
								if (fs.existsSync(path)) {
									bot.uploadFile({
										to: channelID,
										file: path,
										message: mess
									});
								} else {
									logger.warn('Image not found @' + path);
									bot.sendMessage({
										to: channelID,
										message: mess
									});
								}
							} else {
								bot.sendMessage({
									to: channelID,
									message: 'I\'m sorry, Tenno, but your requested information is too large (' + mess.length + ' characters). Try disabling drop tables (_!untrack drops_).'
								});
							}
						} else {
							logger.error('parseItemAttribute returned null!')
						}
					} else {
						failedNames.push(parsedName);
						logger.warn('No such item found!');
					}
				}
			}
			if (failedNames.length > 0) {
				var origLength = failedNames.length;
				var mess = 'I couldn\'t find information on ';
				if (origLength == 1) {
					mess += failedNames[0];
				} else {
					for (var fail in failedNames) {
						mess += '[' + failedNames[fail] + ']';
						if (fail < origLength - 2) mess += ', ';
						if (fail == origLength - 2) mess += ' or ';
					}
				}
				bot.sendMessage({
					to: channelID,
					message: mess
				});
			}
		}
	} else {
		logger.info('Received own message!');
	}
});

