/*

	Dimensions task plugin for JsPsych (no moving dots)
	----------------------

	This code was created in the Control and Decision Making Lab at WUSTL,
	and based on code by Rajananda and colleagues (2018):

	Rajananda, S., Lau, H. & Odegaard, B., (2018). A Random-Dot Kinematogram for Web-Based Vision Research. Journal of Open Research Software. 6(1), p.6. DOI: [http://doi.org/10.5334/jors.194]

*/

jsPsych.plugins["dimensions"] = (function() {

	var plugin = {};

	plugin.info = {
	    name: "dimensions",
	    parameters: {
		    choices: {
		      type: jsPsych.plugins.parameterType.INT,
		      pretty_name: "Choices",
		      default: [],
		      array: true,
		      description: "The valid keys that the subject can press to indicate a response"
		    },
		    correct_choice: {
		      type: jsPsych.plugins.parameterType.STRING,
		      pretty_name: "Correct choice",
		      default: undefined,
		      array: true,
		      description: "The correct keys for that trial"
		    },
		    trial_duration: {
		      type: jsPsych.plugins.parameterType.INT,
		      pretty_name: "Trial duration",
		      default: 1500,
		      description: "The length of stimulus presentation"
		    },
		    response_ends_trial: {
		      type: jsPsych.plugins.parameterType.BOOL,
		      pretty_name: "Response ends trial",
		      default: true,
		      description: "If true, then any valid key will end the trial"
		    },
		    background_color: {
		      type: jsPsych.plugins.parameterType.STRING,
		      pretty_name: "Background color",
		      default: "gray",
		      description: "The background of the stimulus"
		    },
				taskCue: {
					type: jsPsych.plugins.parameterType.BOOL,
					pretty_name: "Task Cue",
					default: true,
					description: "If a task is displayed"
				},
				taskName: {
					type: jsPsych.plugins.parameterType.STRING,
					pretty_name: "Task Name",
					default: 1,
					description: "Which task is to be displayed"
				},
				poly_radius: {
		      type: jsPsych.plugins.parameterType.INT,
		      pretty_name: "Shape radius",
		      default: 125,
		      description: "Determines size of the shape"
		    },
				corner_radius: {
		      type: jsPsych.plugins.parameterType.INT,
		      pretty_name: "CornerRadius",
		      default: undefined,
		      description: "The shape of the object"
		    },
		    border_thickness: {
		      type: jsPsych.plugins.parameterType.INT,
		      pretty_name: "Border width",
		      default: undefined,
		      description: "The thickness of the border in pixels"
		    },
				object_color: {
					type: jsPsych.plugins.parameterType.STRING,
					pretty_name: "Object Color",
					default: undefined,
					description: "The color of the object"
				},
				lines_direction: {
		      type: jsPsych.plugins.parameterType.INT,
		      pretty_name: "Line direction",
		      default: undefined,
		      description: "The direction of the lines"
		    },
	    }
	 }

	 //BEGINNING OF TRIAL
	 plugin.trial = function(display_element, trial) {

		//--------------------------------------
		//---------SET PARAMETERS BEGIN---------
		//--------------------------------------

		var nObjects = 2; //The number of objects
		var backgroundColor = trial.background_color; //Color of the background

		var sharpestSurface = Math.pow(trial.poly_radius*2,2)/2 // surface of shape with no rounded corners
		var roundestRadius = Math.sqrt(sharpestSurface/Math.PI) // radius of roundest shape

		//Object Parameters
		var objectColorArray = trial.object_color;
		var cornerRadiusArray = trial.corner_radius;
		var borderThicknessArray = trial.border_thickness; //The width of the border in pixels
		var linesDirectionArray = trial.lines_direction;

		// objectColorArray = [0.6,1.0]
		// cornerRadiusArray = [1,0]
		// borderThicknessArray = [1+19/5*0,1+19/5*1]
		// linesDirectionArray = [(Math.PI/2)/5*2,(Math.PI/2)/5*4]
		//--------------------------------------
		//----------SET PARAMETERS END----------
		//--------------------------------------

		//--------Set up Canvas begin-------

		//Create a canvas element and append it to the DOM
		var canvas = document.createElement("canvas");
		display_element.appendChild(canvas);

		//The document body IS 'display_element' (i.e. <body class="jspsych-display-element"> .... </body> )
		var body = document.getElementsByClassName("jspsych-display-element")[0];

		//Save the current settings to be restored later
		var originalMargin = body.style.margin;
		var originalPadding = body.style.padding;
		var originalBackgroundColor = body.style.backgroundColor;

		//Remove the margins and paddings of the display_element
		body.style.margin = 0;
		body.style.padding = 0;
		body.style.backgroundColor = backgroundColor; //Match the background of the display element to the background color of the canvas so that the removal of the canvas at the end of the trial is not noticed

		//Remove the margins and padding of the canvas
		canvas.style.margin = 0;
		canvas.style.padding = 0;

		//Get the context of the canvas so that it can be painted on.
		var ctx = canvas.getContext("2d");

		//Declare variables for width and height, and also set the canvas width and height to the window width and height
		var canvasWidth = canvas.width = window.innerWidth - 120;
		var canvasHeight = canvas.height = window.innerHeight - 30;

		var objectCenterXArray = [canvasWidth/2 - 350 + 95, canvasWidth/2 + 350]; // The x-coordinate of center of the object on the screen, in pixels
		var objectCenterYArray = [canvasHeight/2, canvasHeight/2]; // The y-coordinate of center of the object on the screen, in pixels

		//Set the canvas background color
		canvas.style.backgroundColor = backgroundColor;

		//--------Set up Canvas end-------

		//--------RDK variables and function calls begin--------

		//This is the main part of the trial that makes everything run

		//Global variable for the current object number
		var currentObjectNumber;

		//Variable to start the timer when the time comes
		var timerHasStarted = false;

		//Initialize object to store the response data. Default values of -1 are used if the trial times out and the subject has not pressed a valid key
		var response = {
			rt: -1,
			key: -1
		}

		//Declare a global timeout ID to be initialized below in animateDotMotion function and to be used in after_response function
		var timeoutID;

		//Declare global variable to be defined in startKeyboardListener function and to be used in end_trial function
		var keyboardListener;

		//--------RDK variables and function calls end--------

		//-------------------------------------
		//-----------FUNCTIONS BEGIN-----------
		//-------------------------------------

		//----JsPsych Functions Begin----

		//Function to start the keyboard listener
		function startKeyboardListener(){
			//Start the response listener if there are choices for keys
			if (trial.choices != jsPsych.NO_KEYS) {
				//Create the keyboard listener to listen for subjects' key response
				keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
					callback_function: after_response, //Function to call once the subject presses a valid key
					valid_responses: trial.choices, //The keys that will be considered a valid response and cause the callback function to be called
					rt_method: 'performance', //The type of method to record timing information.
					persist: false, //If set to false, keyboard listener will only trigger the first time a valid key is pressed. If set to true, it has to be explicitly cancelled by the cancelKeyboardResponse plugin API.
					allow_held_key: false //Only register the key once, after this getKeyboardResponse function is called. (Check JsPsych docs for better info under 'jsPsych.pluginAPI.getKeyboardResponse').
				});
			}
		}

		//Function to end the trial proper
		function end_trial() {

			//Kill the keyboard listener if keyboardListener has been defined
			if (typeof keyboardListener !== 'undefined') {
				jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
			}

			//Place all the data to be saved from this trial in one data object
			var trial_data = {
				"rt": response.rt, //The response time
				"key_press": response.key, //The key that the subject pressed
				"correct": correctOrNot(), //If the subject response was correct
				"choices": trial.choices, //The set of valid keys
				"correct_choice": trial.correct_choice, //The correct choice
				"trial_duration": trial.trial_duration, //The trial duration
				"response_ends_trial": trial.response_ends_trial, //If the response ends the trial
				"lines_direction": trial.lines_direction,
				"background_color": trial.background_color,
				"border_radius": trial.border_radius,
				"border_thickness": trial.border_thickness,
				"object_color": trial.object_color,
				"canvas_width": canvasWidth,
				"canvas_height": canvasHeight,
				"task": trial.taskName,
			}

			//Remove the canvas as the child of the display_element element
			display_element.innerHTML='';

			//Restore the settings to JsPsych defaults
			body.style.margin = originalMargin;
			body.style.padding = originalPadding;
			body.style.backgroundColor = originalBackgroundColor

			//End this trial and move on to the next trial
			jsPsych.finishTrial(trial_data);

		} //End of end_trial

		//Function to record the first response by the subject
		function after_response(info) {

			//If the response has not been recorded, record it
			if (response.key == -1) {
				response = info; //Replace the response object created above
			}

			//If the parameter is set such that the response ends the trial, then kill the timeout and end the trial
			if (trial.response_ends_trial) {
				window.clearTimeout(timeoutID);
				end_trial();
			}

		} //End of after_response

		//Function that determines if the response is correct
		function correctOrNot(){

			//Check that the correct_choice has been defined
			if(typeof trial.correct_choice !== 'undefined'){
				//If the correct_choice variable holds an array
				if(trial.correct_choice.constructor === Array){ //If it is an array
					//If the elements are characters
					if(typeof trial.correct_choice[0] === 'string' || trial.correct_choice[0] instanceof String){
						trial.correct_choice = trial.correct_choice.map(function(x){return x.toUpperCase();}); //Convert all the values to upper case
						return trial.correct_choice.includes(String.fromCharCode(response.key)); //If the response is included in the correct_choice array, return true. Else, return false.
					}
					//Else if the elements are numbers (javascript character codes)
					else if (typeof trial.correct_choice[0] === 'number'){
						return trial.correct_choice.includes(response.key); //If the response is included in the correct_choice array, return true. Else, return false.
					}
				}
				//Else compare the char with the response key
				else{
					//If the element is a character
					if(typeof trial.correct_choice === 'string' || trial.correct_choice instanceof String){
						//Return true if the user's response matches the correct answer. Return false otherwise.
						return response.key == trial.correct_choice.toUpperCase().charCodeAt(0);
					}
					//Else if the element is a number (javascript character codes)
					else if (typeof trial.correct_choice === 'number'){
						return response.key == trial.correct_choice;
					}
				}
			}
		}

		//----JsPsych Functions End----

		//----RDK Functions Begin----

		//Function to set the global variables to the current object so that the correct dots are updated and drawn
		function initializeCurrentObjectParameters(){

			//Set the global variables to that relevant to the current object
			objectCenterX = objectCenterXArray[currentObjectNumber] - 47.5;
			objectCenterY = objectCenterYArray[currentObjectNumber];
			cornerRadius = cornerRadiusArray[currentObjectNumber]*roundestRadius;
			borderThickness = borderThicknessArray[currentObjectNumber];
			objectColor = objectColorArray[currentObjectNumber];
			linesDirection = linesDirectionArray[currentObjectNumber];

		}// End of initializeCurrentObjectParameters

		function draw() {
			ctx.lineWidth = borderThickness;

			var color = interpolated(objectColor, winter_iso)
			ctx.fillStyle = "rgba("+color[0]+", "+color[1]+", "+color[2]+", 1)";

			var numberOfSides = 4

			var side = Math.sqrt((4-Math.PI)*Math.pow(cornerRadius,2)+sharpestSurface) // equalize
			var size = Math.sqrt(2*Math.pow(side,2))/2

			var poly_shape = []
			for (var i = 0; i < numberOfSides;i += 1) {
				poly_shape[i] = {x: objectCenterX + size * Math.cos(i * 2 * Math.PI / numberOfSides), y: objectCenterY + size * Math.sin(i * 2 * Math.PI / numberOfSides)}
			}

			ctx.save(); // save current context
			ctx.beginPath(); // start a new pat
			roundedPoly(poly_shape, cornerRadius); // draw shape
			ctx.fill();

			//draw lines
			ctx.clip();
			ctx.translate(objectCenterX, objectCenterY);
    	ctx.rotate(linesDirection); // rotate
    	ctx.drawImage(lines, -trial.poly_radius, -trial.poly_radius);
			ctx.rotate(-linesDirection); // rotate
			ctx.translate(-objectCenterX, -objectCenterY);

			ctx.stroke(); // draw border
			ctx.restore();

		}//End of draw

		function drawStimulus() {
			for(currentObjectNumber = 0; currentObjectNumber < nObjects; currentObjectNumber++){

				//Initialize the variables for each parameter
				initializeCurrentObjectParameters(currentObjectNumber);

				//Draw on the canvas
				draw();

			}

			if(trial.taskCue === true){
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.font = '48px sans-serif';
				ctx.fillStyle = 'black';
				ctx.fillText(trial.taskName, canvasWidth/2, canvasHeight/2);
			}

		}

		//----Canvas functions End----

		//----General Functions Begin//----

		//Function to assign the default values for the staircase parameters
		function assignParameterValue(argument, defaultValue){
			return typeof argument !== 'undefined' ? argument : defaultValue;
		}

		var roundedPoly = function(points,radius){

	    var i, x, y, len, p1, p2, p3, v1, v2, sinA, sinA90, radDirection, drawDirection, angle, halfAngle, cRadius, lenOut;
	    var asVec = function (p, pp, v) { // convert points to a line with len and normalised
	        v.x = pp.x - p.x; // x,y as vec
	        v.y = pp.y - p.y;
	        v.len = Math.sqrt(v.x * v.x + v.y * v.y); // length of vec
	        v.nx = v.x / v.len; // normalised
	        v.ny = v.y / v.len;
	        v.ang = Math.atan2(v.ny, v.nx); // direction of vec
	    }
	    v1 = {};
	    v2 = {};
	    len = points.length;                         // number points
	    p1 = points[len - 1];                        // start at end of path
	    for (i = 0; i < len; i++) {                  // do each corner
	        p2 = points[(i) % len];                  // the corner point that is being rounded
	        p3 = points[(i + 1) % len];
	        // get the corner as vectors out away from corner
	        asVec(p2, p1, v1);                       // vec back from corner point
	        asVec(p2, p3, v2);                       // vec forward from corner point
	        // get corners cross product (asin of angle)
	        sinA = v1.nx * v2.ny - v1.ny * v2.nx;    // cross product
					sinA = Math.min(Math.max(sinA,-1),1);
	        // get cross product of first line and perpendicular second line
	        sinA90 = v1.nx * v2.nx - v1.ny * -v2.ny; // cross product to normal of line 2
	        angle = Math.asin(sinA);                 // get the angle
	        radDirection = 1;                        // may need to reverse the radius
	        drawDirection = false;                   // may need to draw the arc anticlockwise
	        // find the correct quadrant for circle center
	        if (sinA90 < 0) {
	            if (angle < 0) {
	                angle = Math.PI + angle; // add 180 to move us to the 3 quadrant
	            } else {
	                angle = Math.PI - angle; // move back into the 2nd quadrant
	                radDirection = -1;
	                drawDirection = true;
	            }
	        } else {
	            if (angle > 0) {
	                radDirection = -1;
	                drawDirection = true;
	            }
	        }
	        halfAngle = angle / 2;
	        // get distance from corner to point where round corner touches line
	        lenOut = Math.abs(Math.cos(halfAngle) * radius / Math.sin(halfAngle));
	        if (lenOut > Math.min(v1.len / 2, v2.len / 2)) { // fix if longer than half line length
	            lenOut = Math.min(v1.len / 2, v2.len / 2);
	            // ajust the radius of corner rounding to fit
	            cRadius = Math.abs(lenOut * Math.sin(halfAngle) / Math.cos(halfAngle));
	        } else {
	            cRadius = radius;
	        }
	        x = p2.x + v2.nx * lenOut; // move out from corner along second line to point where rounded circle touches
	        y = p2.y + v2.ny * lenOut;

	        x += -v2.ny * cRadius * radDirection; // move away from line to circle center
	        y += v2.nx * cRadius * radDirection;
	        // x,y is the rounded corner circle center
	        ctx.arc(x, y, cRadius, v1.ang + Math.PI / 2 * radDirection, v2.ang - Math.PI / 2 * radDirection, drawDirection); // draw the arc clockwise
	        p1 = p2;
	        p2 = p3;

	    }
	    ctx.closePath();
		}
		//----General Functions End//----

		//----Start trial---

		drawStimulus();

		startKeyboardListener();
		timeoutID = window.setTimeout(end_trial,trial.trial_duration);

		//-------------------------------------
		//-----------FUNCTIONS END-------------
		//-------------------------------------


	}; // END OF TRIAL

	//Return the plugin object which contains the trial
	return plugin;
})();
