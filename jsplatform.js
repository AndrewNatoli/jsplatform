var c, ctx; //Canvas
var gameTimer;
var startTime;

//Debug
var collisionDebug = "";
var collisionIndex = -1;


//Collision detection and platform objects
var platforms=[]; //Rectangular platform objects
var missedPlatforms = 0; //The number of platforms player is NOT on top of. (if n != active, player.falling = true)
var activePlatforms = 0; //The number of platforms the player is near

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

//Game startup 
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

/* Player Object */
var player = {
	x:100,			//x pos
	y:100,			//y pos
	xspeed:0,		//Horizontal Speed
	yspeed:0,		//Veritcal Speed
	width:25,		//The width of our block
	falling:true,	//Whether or not we're falling
	
	//Control the player's motion...
	move: function(deltaTime) {
		//Move right
		if(keysDown[KEY_RIGHT] == true) {
			if(this.x+this.width < c.width) {
				this.xspeed = 125;
			}
			else
				this.xspeed = 0;
		}
		//Move left
		if(keysDown[KEY_LEFT] == true) {
			if (this.x > 0) {
				this.xspeed = -125;
			}
			else
				this.xspeed = 0;
		}
		//Not moving horizontally...
		if (keysDown[KEY_LEFT] == false && keysDown[KEY_RIGHT] == false)
			this.xspeed = 0;
			
		//Jump [need to revise this later]
		if(keysDown[KEY_UP] && this.falling == false) {
			this.yspeed = -280;
		}
		
		//Control our falling
		if(this.falling == true) //Start Falling
			this.yspeed+=2.0;
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
		ctx.fillRect(this.x,this.y,this.width,this.width);
	}
};


//Generic rectangular platform
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

Platform.prototype.startstep = function() {
	//Nothing
};

/* 	Platform step event
	Runs collision detection, etc.
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
				if((player.x+player.width > this.x && player.x < this.x+this.width)) {
					if(player.yspeed > this.y-(player.y+player.width)) {
						player.yspeed = this.y-(player.y+player.width);
					}
				}
			}
			//If our calculations failed (probably due to multiple platforms being involved) fix the error!
			if((player.y+player.width > this.y) && (player.y < this.y) && (player.x+player.width > this.x)) {
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
	
//Platform draw event
Platform.prototype.draw = function() {
			ctx.fillStyle=this.color;
			ctx.fillRect(this.x,this.y,this.width,this.height);
};



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
			case 2: 	this.ymovement();		break;
			default: 	alert(this.direction); break;
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
	player.step(deltaTime);
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
	UpdateDebug(drawTime);
}

//Calculate and return the distance between two objects with x and y coordinates
function distance_between(object1,object2) {
	return distance = Math.sqrt(Math.pow(object2.x-object1.x,2) + Math.pow(object2.y-object1.y,2));
}

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
}

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
				break;

				//Create a moving platform
				case "1":
					platforms.push(new MovingPlatform(i,data[1],data[2],data[3],data[4],data[5],data[6],data[7],data[8]));	
				break;

				default:
					alert("Unknown platform type at line " + i);
				break;
			}
			activePlatforms++;
		}
	}
}


$(document).ready(function() {
	$.ajax({
		type:"GET",
		url:"level.txt",
		dataType:"text",
		success: function(data) { loadLevel(data); }
	});
});
init();