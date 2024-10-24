//dependencies
import fetch from "node-fetch";
import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';
import 'dotenv/config';

console.log("app starting");
const db = false;

import pg from 'pg';
const { Client: PgClient } = pg;

//POSTGRESTESTING BEGIN

//Table creation
const createTableQuery = `
CREATE TABLE IF NOT EXISTS logs (
	id SERIAL PRIMARY KEY,
	message TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

// Connection State Variables
let globalPgClient = null;
let isConnected = false;
let connectionPromise = null;
const logQueue = [];

// Function to Connect to PostgreSQL with Retry Logic
function connectWithRetry(retries = 10, delay = 5000) {
    if (!connectionPromise) {
        connectionPromise = new Promise((resolve, reject) => {
            const attemptConnection = (attempt) => {
				//Postgres client
				const pgclient = new PgClient({
					host: process.env.PGHOST,
					user: process.env.PGUSER,
					password: process.env.PGPASS,
					database: process.env.PGDB,
					port: process.env.PGPORT,
				});
                pgclient.connect()
                    .then(() => {
                        console.log('Connected to PostgreSQL');
                        return pgclient.query(createTableQuery);
                    })
                    .then(() => {
                        console.log('Logs table created or already exists');
                        isConnected = true;
						globalPgClient = pgclient;
                        resolve();
                        // Flush any queued log messages
                        flushLogQueue();
                    })
                    .catch((err) => {
                        console.error(`Connection attempt ${attempt} failed:`, err.stack);
                        if (attempt < retries) {
                            console.log(`Retrying in ${delay / 1000} seconds...`);
                            setTimeout(() => attemptConnection(attempt + 1), delay);
                        } else {
                            reject(new Error('Failed to connect to PostgreSQL after multiple attempts'));
                        }
                    });
            };
            attemptConnection(1);
        });
    }
    return connectionPromise;
}

// Function to Flush the Log Queue
function flushLogQueue() {
    while (logQueue.length > 0) {
        const { message, resolve, reject } = logQueue.shift();
        executeLog(message).then(resolve).catch(reject);
    }
}

// Function to Execute a Log Insert
function executeLog(message) {
    const query = 'INSERT INTO logs(message) VALUES($1)';
    return globalPgClient.query(query, [message])
        .then(() => {
            console.log('Log written to database');
        })
        .catch(err => {
            console.error('Error writing log', err.stack);
            throw err;
        });
}

// The Log Function
function log(message) {
	if (!db){
		return console.log(message);
	}
    if (isConnected) {
        // If connected, execute immediately
        return executeLog(message);
    } else {
        // If not connected, queue the log message
        return new Promise((resolve, reject) => {
            logQueue.push({ message, resolve, reject });
        });
    }
}

if (db) {
// Initialize the Connection Process
connectWithRetry()
    .catch(err => {
        console.error('Unable to establish a database connection:', err.message);
        // Optionally, handle the failure (e.g., exit the process, use alternative logging, etc.)
    });
}

// Test the log function
log('This is a test log');

//POSTGRESTESTING END

let wpingCD = 9999;
let bopingCD = 9999;
let vopingCD = 9999;
let aopingCD = 9999;
let lastblcount = 0;
let lastvgcount = 0;

let blg = [0, 0, 0, 0, 0];
let vgg = [0, 0, 0, 0, 0];
let blast = 0;
let vlast = 0;
let btpingCD = 9999;
let vtpingCD = 9999;
let started = true;

let lastStr = "not ready";

//make client
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.DirectMessages,
	],
	partials: [
		Partials.Channel
	],
});

//client ready
client.once(Events.ClientReady, async () => {
	log(`Bot ready! Logged in as ${client.user.tag}`);

	//check every 15 minutes
	try {online(client);}catch (error) {console.error(error);}
	setInterval(() => {try {online(client);}catch (error) {console.error(error);}}, 1000 * 60 * 5)

	//check every minute
	try {tax(client);}catch (error) {console.error(error);}
	setInterval(() => {try {tax(client);}catch (error) {console.error(error);}}, 1000 * 60)
});

function countOver(arr, thresh){
	let sum = 0;
	for(let item of arr) {
		sum += item > thresh ? 1 : 0;
	}
	return sum;
}

function arrToString(arr){
	let returnString = "";
	if(arr.length === 0) return returnString;
	for(let str of arr) {
		returnString += " " + str;
	}
	return returnString.substring(1);
}

//online
async function online(client, msg) {
	//initialize variables
	let str = "!online";
	let printString = "";
	let count = 0;
	let blcount = 0;
	let vgcount = 0;

	if (msg) {
		str = msg.content;
	}
	
	//defaults
	if (str.split(/,|\s+/).length === 1) {
		str = "Nept Ruin Hot LoRe TEX Cult -AE ~TD~ ~P~";
	}

	//split input by spaces
	for (let clan of str.split(/,|\s+/)) {
		//clan string
		let clanString = ""; 

		//doesnt count its own command
		if (clan === "!online") {
			continue;
		}

		//use clan search to find what clan the user is referring to
		//this way someone can type "ae" and it knows that the user is referring to "-AE"
		const clanGuess = await fetch(process.env.URL, {method: "POST", body: JSON.stringify({name: clan, order: 1})});
		const clanGuessText = await clanGuess.json();

		//if clan exists
		if (clanGuessText.clans.length > 0) {
			//get clan tag and online members for clan
			const clanTag = clanGuessText.clans[0].tag;
			const clanData = await fetch(process.env.URL2, {method: "POST", body: JSON.stringify({tag: clanTag})});
			const clanDataText = await clanData.json();

			//if clan has an online member
			if (clanDataText.members[0].online) {
				//loop over online members
				let clanCount = 0;
				for (const member of clanDataText.members) {
					if (member.online) {
						clanString += member.name + "\n";
						count++;
						clanCount++;
						if (clanDataText.faction === 0) {
							vgcount++;
						}
						else {
							blcount++;
						}
					}
				}
				//add # of online members
				clanString = "**" + clanTag + ": " + clanCount + " members online**\n" + clanString;
			}
			//if clan has no online member
			else {
				clanString = "**" + clanTag + " has no members online**\n";
			}
		}
		//clan does not exist
		else {
			clanString = '**Clan "' + clan + '" does not exist**\n'
		}

		//add clan string to printed string
		printString += clanString + "\n";
	}

	//add total online members and remove the last "\n"
	printString = "__**Total Online: " + count + "**__\n\n" + printString.substring(0, printString.length - 2) + "\n\n**BL Online: " + blcount + "\nVG Online: " + vgcount + "**";
	
	function pingppl(toPing) {
		for (const user of process.env.PING_IDS.split(/,|\s+/)) {
			client.users.fetch(user, false).then((user) => {
				user.send(toPing + " " + blcount + " " + vgcount);
			})
		}
	}

	//ping if one of the 5-minute messages
	if (Math.floor(Date.now()/3600000)%3 === 2 && !msg) {
		if (blcount >= 10 && vgcount >= 10 && blcount - vgcount <= 0 && wpingCD >= 6 && countOver(blg, 5000) < 2 && countOver(vgg, 5000) < 2) {
			pingppl("war ping");
			wpingCD = 0;
		}
	}
	if (Math.floor(Date.now()/3600000)%3 === 0 && !msg) {
		//Math.floor(Date.now()/43200000%14) >= 5 && Math.floor(Date.now()/43200000%14) <= 11
		if (Math.floor(Date.now()/600000%18) > 0 && Math.floor(Date.now()/600000%18) < 4) {
			if (blcount * 2 + vgcount >= 35 && blcount - vgcount >= 3 && countOver(blg, 5000) < 2) {
				if (bopingCD >= 12) {
					pingppl("bl obe ping");
					bopingCD = 0;
				}
			}
			else if (vgcount * 2 + blcount >= 25 && vgcount - blcount >= 3 && countOver(vgg, 5000) < 2) {
				if (vopingCD >= 12) {
					pingppl("vg obe ping");
					vopingCD = 0;
				}
			}
			else if (blcount >= 10 && vgcount >= 10 && countOver(blg, 5000) < 2 && countOver(vgg, 5000) < 2){
				if (aopingCD >= 12) {
					pingppl("big obe ping");
					aopingCD = 0;
				}
			}
		}
	}
	
	//if a user made command
	if (msg) {
		msg.reply(printString);
	}
	else {
		let strArr = ["obe", "gloom", "regular"];
		log(count + " " + blcount + " " + vgcount + " " + strArr[Math.floor(Date.now()/3600000)%3]);
		lastblcount = blcount;
		lastvgcount = vgcount;
		wpingCD++;
		bopingCD++;
		vopingCD++;
		aopingCD++;
		lastStr = printString;
	}
	
	return printString;
}

//tax
async function tax(client) {
	//initialize variables
	let newblg = 0;
	let newvgg = 0;

	const clanCheck = await fetch(process.env.URL, {method: "POST", body: JSON.stringify({name: "", order: 1})});
	const clanCheckText = await clanCheck.json();

	//split input by spaces
	for (let clan of clanCheckText.clans) {
		//clan string
		if (clan.faction === 0) {
			newvgg += Number(clan.gold);
		}
		if (clan.faction === 1) {
			newblg += Number(clan.gold);
		}
	}
	if(!started) {
		blg = blg.slice(1).concat(newblg - blast);
		vgg = vgg.slice(1).concat(newvgg - vlast);
	}
	blast = newblg;
	vlast = newvgg;
	started = false;
	
	function pingppl(toPing) {
		for (const user of process.env.PING_IDS.split(/,|\s+/)) {
			client.users.fetch(user, false).then((user) => {
				user.send(toPing);
			})
		}
	}
	function pingperson(toPing, idPing) {
		client.users.fetch(idPing, false).then((user) => {
			user.send(toPing);
		})
	}

	if (countOver(blg, 5000) >= 3 && btpingCD >= 60 && Math.floor(Date.now()/1800000)%6 !== 2 && lastblcount >= 5) {
		pingperson("bl farm ping", process.env.PING_ID1);
		btpingCD = 0;
	}
	if (countOver(vgg, 5000) >= 3 && vtpingCD >= 60 && Math.floor(Date.now()/1800000)%6 !== 2 && lastvgcount >= 5) {
		pingperson("vg farm ping", process.env.PING_ID1);
		vtpingCD = 0;
	}
	
	let strArr = ["obe", "gloom", "regular"];
	log(strArr[Math.floor(Date.now()/3600000)%3] + " BL: " + arrToString(blg) + ", VG: " + arrToString(vgg));
	btpingCD++;
	vtpingCD++;
}

//respond to messages
client.on('messageCreate', async msg => {
	const strArr = msg.content.split(" ");
	const command = strArr[0];

	try {
		if (command === "!online") {
			online(client, msg);
			log(msg.author.id + " online");
		}
		if (command === "!on") {
			if(lastStr === "not ready"){
				online(client, msg);
			}
			else{
				msg.reply(lastStr);
			}
			log(msg.author.id + " on");
		}
		if (command === "!farm") {
			msg.reply("**BL:** " + arrToString(blg) + "\n**VG:** " + arrToString(vgg));
			log(msg.author.id + " farm");
		}
		if (command === "!up") {
			msg.reply("pinger up");
			log(msg.author.id + " up");
		}
		if (command === "!help") {
			msg.reply("Commands:\n!up - is the bot up\n!online - checks online ppl in clans\n!on - gets result of last !online, no user delay but result is 0-5 minutes old\n!farm - checks treasury increase (5k on 3 of the last 5 minutes)\n!help - you know this already");
			log(msg.author.id + " help");
		}
	}
	catch (error) {
		console.error(error);
	}
});

//Login
client.login(process.env.DISCORD_TOKEN);