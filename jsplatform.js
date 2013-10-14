/**
 * JSPlatform
 * A simple 2D platform engine using javascript and HTML canvas. 
 * Written by Andrew Natoli with contributions from KJ Lawrence
 * Email:	AndrewNatoli@AndrewNatoli.com
 * Web:		http://AndrewNatoli.com
 * 
 * Feel free to contribute! :D
 */

var c, ctx; //Canvas
var gameTimer;
var startTime;

//Debug
var collisionDebug = "";
var collisionIndex = -1; //Used to tell us the platform ID the player object came in contact with


//Collision detection and platform objects
var platforms=[]; 		 //The platform objects will be loaded into this
var missedPlatforms = 0; //The number of platforms player is NOT on top of. (if n != active, player.falling = true)
var activePlatforms = 0; //The number of platforms the player is near

//Collectables
var collectables=[];
var score = 0;

//Controls
var keysDown = []; //What keys have been pressed
var KEY_UP 		= 38;	keysDown[KEY_UP] 	= false;
var KEY_DOWN	= 40;	keysDown[KEY_DOWN] 	= false;
var KEY_LEFT	= 37;	keysDown[KEY_LEFT] 	= false;
var KEY_RIGHT 	= 39;	keysDown[KEY_RIGHT]	= false;

//Settings
var limitFPS = Math.floor(1000 / 100);		// 1000 / (fps max) - set to 0 for no limit
var fixedStepInterval = 20.00;				// Milliseconds between each step
var fixedStepTime = 0;
var lastDrawTime = 0;
var lastUpdateTime = 0;
var running = true;

var fps = 0;
var fpsCounter = 0;
var fpsTimer = 0;

/**
 * Start the game. Call this after the script has been loaded.
 * This will initialize the game canvas, add key handlers and start the main loop.
 * The level is loaded with AJAX in the onload function.
 */
function init() {
	c=document.getElementById("gameCanvas");
	ctx=c.getContext("2d");
	startTime = (new Date()).valueOf();
	
	document.addEventListener("keydown", function(e) {
		keysDown[e.keyCode] = true;
	},false); 
	
	document.addEventListener("keyup", function(e) {
		keysDown[e.keyCode] = false;
	},false);
	
	mainLoop();
}

/**
 * Main loop for the game handles drawing and updates
 * Simulates Unity's way of updating (http://answers.unity3d.com/questions/10993/whats-the-difference-between-update-and-fixedupdat.html)
 * - FixedStep will always get called at a specific time each second (determined by fixedStepTime)
 * - Draw and update get called as frequently as they can afterwards
 *coo
 */
function mainLoop(){
	var currentTIme = gameTime();
	while (fixedStepTime < currentTIme){
		fixedStep();
		fixedStepTime += fixedStepInterval;
	}
	
	var drawTime = gameTime() - lastDrawTime;
	if (limitFPS > 0){
		if (drawTime >= limitFPS){
			draw(drawTime);
			lastDrawTime = gameTime();
		}
	}
	else{
		draw(drawTime);
		lastDrawTime = gameTime();
	}
	
	var deltaTime = (gameTime() - lastUpdateTime) / 1000;
	step(deltaTime);
	lastUpdateTime = gameTime();
	
	setTimeout(function() { mainLoop(); }, 1);
}

/**
 * Returns total amount of execution time since 
 * the game started in milliseconds
 */
function gameTime(){
	return (new Date()).valueOf() - startTime;
}

/** 
 * The camera object
 */
var Camera = {
	x:0,
	y:0,
	width:720,
	height:480,

	step: function(deltaTime) {
		this.x = (player.x-(this.width/2));
		this.y = (player.y-(this.height/2));
	}
}

/**
 * The player object
 */
var player = {
	x:100,			//x pos
	y:100,			//y pos
	xspeed:0,		//Horizontal Speed
	yspeed:0,		//Veritcal Speed
	width:25,		//The width of our block
	falling:true,	//Whether or not we're falling
	gravity:6.0,
	
	//Control the player's motion...
	move: function(deltaTime) {
		//Move right
		if(keysDown[KEY_RIGHT] == true)
			this.xspeed = 125;
		//Move left
		if(keysDown[KEY_LEFT] == true)
			this.xspeed = -125;
		//Not moving horizontally...
		if (keysDown[KEY_LEFT] == false && keysDown[KEY_RIGHT] == false)
			this.xspeed = 0;
			
		//Jump [need to revise this later]
		if(keysDown[KEY_UP] && this.falling == false) {
			this.yspeed = -480;
		}
		
		//Control our falling
		if(this.falling == true) //Start Falling
			this.yspeed+=this.gravity;
		else if(this.falling == false && keysDown[KEY_UP] == false) //Stop Falling
			this.yspeed = 0;
		
		//Finally, update our position based on speed
		this.x+=this.xspeed * deltaTime;
		this.y+=this.yspeed * deltaTime;		
		
	},
	
	//Check if we've collided with a platform or we are falling. The individual platforms do collision detection now
	platformCollision: function() {
		if (missedPlatforms >= activePlatforms)
			this.falling = true;
	},
	
	//Step / Update Event
	step: function(deltaTime) {
		this.platformCollision();
		this.move(deltaTime);
	},
	
	//Draw
	draw: function() {
		ctx.fillStyle="#00FF00";
		ctx.fillRect(this.x-Camera.x,this.y-Camera.y,this.width,this.width);
	}
};

/**
 * Enemy object
 */
var Enemy = function(pid,px,py) {
	
}

/**
 * An item that can be touched by the player to gain or lose points
 * @param {int} pid The unique id of the object in the collectables[] array
 * @param {int} px The x position
 * @param {int} py The y position
 * @param {int} The score modifier
 */
var Collectable = function(pid,px,py,value) {
	this.id 	=	pid;
	this.x 		= 	+px;
	this.y 		= 	+py;
	this.value  = 	+value;
	this.width 	= 	10;
	this.height = 	10;
	this.color 	=	'#DDDD00';
	this.active = 	true;

	this.step = function(deltaTime) {
		if(this.active == true) {
			if(distance_between(this,player) < player.width) {
				score += this.value;
				this.active = false;
			}
		}
	}

	this.draw = function() {
		if(this.active == true) {
			ctx.fillStyle=this.color;
			ctx.fillRect(this.x-Camera.x,this.y-Camera.y,this.width,this.height);
		}
	}
}

/**
 * Our base platform object
 * Can be extended by pushing a child object to the platforms[] array
 * Use startstep() for custom step instructions to be executed BEFORE collision detection
 * @param {int} pid The ID of the platform (used in platforms[])
 * @param {int} px The x position (top left corner)
 * @param {int} py The y position (top let corner)
 * @param {int} pw The platform's width
 * @param {int} ph The platform's height
 */
var Platform = function(pid,px,py,pw,ph) {
	this.id =	pid;
	this.x 	=	+px;		//X Pos
	this.y 	=	+py;		//Y Pos
	this.width = +pw;		//Width
	this.height= +ph;		//Height
	this.color = '#000000';	//Color
	this.active = true;		//Whether or not this is actively calculating collisions

	/* The distance that will be used to determine whether or not this platform should
	be checking for collisions. More calculations up front, less in the long run! */
	if(this.width > this.height)
		this.checkDistance = this.width + player.width;
	else
		this.checkDistance = this.height + player.width;

	this.startstep = function() { };
};

/**
 * Startstep(); should only be used for child objects
 */
Platform.prototype.startstep = function() {
	//Nothing
};


/**
 * Base platform step event
 * This handles collision detection. Use startstep() to add custom instructions to child objects
 */
Platform.prototype.step = function() {
		//Check if player is close to platform before we calculate distance.
		if(distance_between(this,player) > this.checkDistance) {
			this.color = "#0000FF";
			if(this.active == true) {
				//This platform should no longer be counted as active
				activePlatforms-=1;
				this.active = false;
			}
			return;
		}
		else {
			//We're close to the platform... enable collision detection
			if(this.active == false) {
				activePlatforms+=1;
				this.active = true;
			}
		}
			 
		//Check if the player is on top of the platform
		if ((player.x <= this.x+this.width) && player.x+player.width > this.x && player.y+player.width >= this.y-2 && player.y+player.width <= this.y+this.height) {
			player.falling = false;
			//Make sure the player won't be falling through the platform...
			if(player.falling == true) {
					if(player.yspeed > this.y-(player.y+player.width)) {
						player.yspeed = this.y-(player.y+player.width);
					}
			}
			//If our calculations failed (probably due to multiple platforms being involved) fix the error!
			if((player.y+player.width > this.y)) {
				player.y = this.y-player.width;
			}
			this.color="#00CC00";

			collisionDebug="ON_TOP";
			collisionIndex=this.id;
		}
		else {
			//We're not touching the platform
			missedPlatforms++;	//Increment the number of platforms we aren't touching
			this.color="#CC0000";
		}
		
		//Check if player is hitting their head...
		//X Collision detections = (Player is wider than platform), (left corner), (right corner), (in between)
		if (((player.x <= this.x && player.x+player.width >= this.x+this.width) || (player.x < this.x && player.x+player.width >= this.x) || (player.x < this.x+this.width && player.x+player.width >= this.x+this.width) || (player.x >= this.x && player.x+player.width <= this.x+this.width)) && (player.y+player.width > this.y+this.height && player.y <= this.y+this.height)) {
			player.yspeed = player.yspeed*-1;
			collisionDebug="BOTTOM";
			collisionIndex=this.id;
			if(player.y<=this.y+this.height)
				player.y=this.y+this.height+1;
		}

		//Check if the player is hitting the left side of the platform
		if (distance_between(this,player) < player.width*2 && (player.y < this.y+this.height) && (player.x+player.width >= this.x-2 && player.x < this.x) && ( player.y+player.width > this.y || (player.y >= this.y && player.y+player.width <= this.y+this.height) || (player.y+player.width >= this.y+this.height && player.y <= this.y+this.height))) {
			if(keysDown[KEY_RIGHT] == true) {
				player.xspeed = 0;
				keysDown[KEY_RIGHT] = false;
				
				collisionDebug="LEFT";
				collisionIndex=this.id;
			}
		}

		//Check if the player is hitting the right side of the platform
		if (distance_between(this,player) < player.width*(player.width*2) && (player.y < this.y+this.height) && (player.x >= this.x+this.width && player.x < this.x+this.width+2) && ( player.y+player.width >= this.y || (player.y >= this.y && player.y+player.width <= this.y+this.height) || (player.y+player.width >= this.y+this.height && player.y <= this.y+this.height))) {
			if(keysDown[KEY_LEFT] == true) {
				player.xspeed = 0;
				keysDown[KEY_LEFT] = false;
				collisionDebug="RIGHT";
				collisionIndex=this.id;
			}
		}
	};
	
/**
 * Draw the platform
 */
Platform.prototype.draw = function() {
	ctx.fillStyle=this.color;
	ctx.fillRect(this.x-Camera.x,this.y-Camera.y,this.width,this.height);
};


/**
 * Moving Platform Objects
 * Branch off of the platform object and its prototype for collision. Has its own motion controls.
 * These parameters should be filled automatically by loadlevel();
 * @param {int} pid The platform id stored in platforms[]
 * @param {int} px The starting x position
 * @param {int} py The starting y position
 * @param {int} pw Platform width (from left side)
 * @param {int} ph Platform height (from top left corner)
 * @param {int} pdir Axis the platform moves along (1:y-axis, 2:x-axis)
 * @param {int} pspd The amount the platform moves each step
 * @param {int} pendmove The x or y position (pending on pdir) at which the platform reverses motion
 */
var MovingPlatform = function(pid,px,py,pw,ph,pdir,pspd,pendmove) {
	this.id =		+pid;
	this.x 	=		+px;		//X Pos
	this.y 	=		+py;		//Y Pos
	this.startx = 	+px;		//Starting x position (for movement)
	this.starty = 	+py;		//Starting y position (for movement)
	this.width = 	+pw;		//Width
	this.height= 	+ph;		//Height
	this.color = 	'#000000';	//Color
	this.active = 	true;		//Whether or not this is actively calculating collisions

	//Motion properties
	this.direction 	= +pdir;		//Direction of motion (1:y, 2:x)
	this.reverse	= false;		//If we hit the end point and need to reverse ourselves
	this.speed 		= +pspd;		//Speed of motion
	this.endpos		= +pendmove;	//End coordinate (y or x)

	/* The distance that will be used to determine whether or not this platform should
	be checking for collisions. More calculations up front, less in the long run! */
	if(this.width > this.height)
		this.checkDistance = this.width + player.width;
	else
		this.checkDistance = this.height + player.width;

	this.step = Platform.prototype.step;
	this.draw = Platform.prototype.draw;
	
	this.startstep = function() {
		switch(this.direction) {
			case 1:		this.xmovement(); 	break;
			case 2: 	this.ymovement();	break;
		}
	};

	this.xmovement = function() {
		switch(this.reverse) {
			case false:
				if(this.x+this.width < this.endpos) {
					this.x += this.speed;
					if(collisionIndex == this.id && player.falling == false && keysDown[KEY_LEFT] == false)
						player.x +=this.speed;
				}
				else
					this.reverse = true;
			break;
			case true:
				if(this.x > this.startx) {
					this.x -= this.speed;
					if(collisionIndex == this.id && player.falling == false && keysDown[KEY_RIGHT] == false)
						player.x -=this.speed;
				}
				else
					this.reverse = false;
			break;
			default: throw("Bad direction value (platform id:" + this.id + ")"); 
			break;
		}

		//If we collide with the player, push them.
		if(this.reverse == true) { //If moving left, push them left
			if(player.y<this.y+this.height-1 && player.y+player.width > this.y+this.height && player.x+player.width > this.x && player.x+player.width < this.x+this.width) {
				player.x = this.x-player.width; 
				player.y += player.gravity/5; 
			}
		}
		else { //Push them right if moving right
			if(player.y<this.y+this.height-1 && player.y+player.width > this.y+this.height && player.x < this.x+this.width && player.x+player.width > this.x+this.width) {
				player.x = this.x+this.width+1;
				player.y += player.gravity/5;
			}
		}
	};

	this.ymovement = function() {
		switch(this.reverse) {
			case false:
				if(this.y+this.height < this.endpos)
					this.y += this.speed;
				else
					this.reverse = true;
			break;
			case true:
				if(this.y > this.starty)
					this.y -= this.speed;
				else
					this.reverse = false;
			break;
			default: throw("Bad direction value (platform id:" + this.id + ")"); 
			break;
		}
	};
};

MovingPlatform.prototype = Platform;

function fixedStep(){
}

function step(deltaTime) {
	//Reset the draw interval
	//window.clearInterval("gameTimer");		
	missedPlatforms=0;
	for(var i=0; i<platforms.length; i++) {
		platforms[i].startstep();
		platforms[i].step();
	}	
	for(var i=0; i<collectables.length; i++) {
		collectables[i].step();
	}
	player.step(deltaTime);
	Camera.step(deltaTime);
}

function draw(drawTime) {
	fpsCounter++;
	
	if (fpsTimer == 0 || gameTime() - fpsTimer > 1000){
		fpsTimer = gameTime();
		fps = fpsCounter;
		fpsCounter = 0;
	}

	//Reset the draw buffer
	ctx.fillStyle="#FFFFFF";
	ctx.fillRect(0,0,c.width,c.height);
	//Now draw :D
	player.draw();
	for(i=0; i<platforms.length; i++) {
		platforms[i].draw();
	}		
	for(i=0; i<collectables.length; i++) {
		collectables[i].draw();
	}	
	UpdateDebug(drawTime);
}

/**
 * Calculate and return the distance between two objects using their x and y coordinates
 * @param {object} object1
 * @param {object} object2
 */
function distance_between(object1,object2) {
	return distance = Math.sqrt(Math.pow(object2.x-object1.x,2) + Math.pow(object2.y-object1.y,2));
}

/**
 * Returns true if a position will result in a collision with object2
 * Two parameters	(Object1, Object2) - Check if two objects are colliding
 * Three Parameters	(x, y, Object2) - Check if a point will collide with Object 2
 * -Objects MUST have the following properties: x,y,width,height
 * 
 * @param {object} o1 	Object1	OR	{number} x
 * @param {object} o2 	Object2	OR	{number} y
 * @param {object} obj2 Object2 (OPTIONAL)
 */
function place_meeting(o1,o2,obj2) {
	//Check for collision between two objects
	if(obj2 == null) {
		if(o1.x+o1.width >= o2.x && o1.x <= o2.x+o2.width && o1.y+o1.height >= o2.y && o1.y <= o2.y+o2.height)
			return true;
		else
			return false;
	}
	//Check for point collision
	else {
		if(o1 >= obj2.x && o1 <= obj2.x+obj2.width && o2>=obj2.y && o2<=obj2.y+obj2.height)
			return true;
		else
			return false;
	}
}

/**
 * Updates the debug information in our sidebar
 * @param drawTime
 */
function UpdateDebug(drawTime) {
	document.getElementById("player_x").innerHTML=player.x;
	document.getElementById("player_y").innerHTML=player.y;
	document.getElementById("player_v").innerHTML=player.xspeed + ", " + player.yspeed;
	document.getElementById("fps").innerHTML = fps;

	if (player.falling == true)
		document.getElementById("player_f").innerHTML="true";
	else
		document.getElementById("player_f").innerHTML="false";

	document.getElementById("missed_platforms").innerHTML=missedPlatforms + " of " + activePlatforms;
	document.getElementById("collision_debug").innerHTML=collisionDebug;
	document.getElementById("collision_index").innerHTML=collisionIndex;
	document.getElementById("score").innerHTML=score;
}

/**
 * Loads the level from a text file. This is called from init();
 * @param {String} allText The text file loaded in init
 */
function loadLevel(allText) {
	var allTextLines = allText.split(/\r\n|\n/);
	var headers = allTextLines[0].split(',');
	for(var i=0; i<allTextLines.length; i++) {
		var data = allTextLines[i].split(',');
		if(data.length == headers.length) {
			var block = [];
			switch (data[0]) {
				//Create a platform
				case "0":
					platforms.push(new Platform(i,data[1],data[2],data[3],data[4]));	
					activePlatforms++;
				break;

				//Create a moving platform
				case "1":
					platforms.push(new MovingPlatform(i,data[1],data[2],data[3],data[4],data[5],data[6],data[7],data[8]));	
					activePlatforms++;
				break;

				case "2":
					//							   pid px 	  py 	  value
					collectables.push(new Collectable(i,data[1],data[2],data[3]));
				break;

				default:
					alert("Unknown platform type at line " + i);
				break;
			}
		}
	}
}

/**
 * Import the level data file and process it with loadlevel();
 */
$(document).ready(function() {
	$.ajax({
		type:"GET",
		url:"level.txt",
		dataType:"text",
		success: function(data) { loadLevel(data); }
	});
});

/*Start the game*/
init();