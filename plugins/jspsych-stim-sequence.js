/**
 * jspsych-stim-sequence
 * Mike Shvartsman
 *
 * plugin for displaying a stimulus sequence and getting a single keyboard response
 *
 * documentation: docs.jspsych.org
 *
 **/

 (function($) {
 	jsPsych["stim-sequence"] = (function() {

 		var plugin = {};

 		plugin.create = function(params) {

 			params = jsPsych.pluginAPI.enforceArray(params, ['stimuli', 'choices', 'data']);

 			var trials = new Array(params.stimuli.length);
 			for (var i = 0; i < trials.length; i++) {
 				trials[i] = {};
 				trials[i].stimuli = params.stimuli[i];
 				trials[i].choices = params.choices || [];
				// option to show image for fixed time interval, ignoring key responses
				//      true = image will keep displaying after response
				//      false = trial will immediately advance when response is recorded
				trials[i].continue_after_response = (typeof params.continue_after_response === 'undefined') ? true : params.continue_after_response;
				// timing parameters
				trials[i].stim_durations = params.stim_durations; 
				trials[i].resp_onset = params.resp_onset || -1; // if -1, then start on final stim
				trials[i].resp_offset = params.resp_offset || -1; // if -1, then wait for response forever
				// optional parameters
				trials[i].is_html = (typeof params.is_html === 'undefined') ? false : params.is_html;
				trials[i].prompt = (typeof params.prompt === 'undefined') ? "" : params.prompt;
			}
			return trials;
		};


		plugin.trial = function(display_element, trial) {

			// if any trial variables are functions
			// this evaluates the function and replaces
			// it with the output of the function
			trial = jsPsych.pluginAPI.normalizeTrialVariables(trial);

			// this array holds handlers from setTimeout calls
			// that need to be cleared if the trial ends early
			var setTimeoutHandlers = [];

			var stim_onsets = [];
			stim_onsets[0] = 0; // first stim just appears at 0
			for (i = 1; i < trial.stim_durations.length; i++){
				// subsequent ones are just incremented by the durations
				stim_onsets[i] = stim_onsets[i-1] + trial.stim_durations[i-1]; 
			}

			if (!trial.is_html) {
				display_element.append($('<img>', {
					src: trial.stimuli[0],
					id: 'jspsych-stim-sequence-stimulus'
				}));
			} else {
				display_element.append($('<div>', {
					html: trial.stimuli[0],
					id: 'jspsych-stim-sequence-stimulus'
				}));
			}
			
			// register stim onsets
			var previously_displayed_stim = 0; 
			for (i = 1; i < trial.stimuli.length; i++){ // index from 1 because we appeared 0 above
				var t = setTimeout(function(){
					// when this registered i is defined but when it fires, i is not...
					// so just fire what's on tap and increment
					if (!trial.is_html) {
						$("#jspsych-stim-sequence-stimulus").src(trial.stimuli[previously_displayed_stim+1]);
					} else {
						$("#jspsych-stim-sequence-stimulus").html(trial.stimuli[previously_displayed_stim+1]);
					}
					previously_displayed_stim ++ ; 
				}, stim_onsets[i]);
				setTimeoutHandlers.push(t); 
			}

			//show prompt if there is one
			if (trial.prompt !== "") {
				display_element.append(trial.prompt);
			}

			// store response
			var response = {rt: -1, key: -1};

			// function to end trial when it is time
			var end_trial = function() {

				// kill any remaining setTimeout handlers
				for (var i = 0; i < setTimeoutHandlers.length; i++) {
					clearTimeout(setTimeoutHandlers[i]);
				}

				// kill keyboard listeners
				if(typeof keyboardListener !== 'undefined'){
					console.log("killed?");
					jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
				}

				// gather the data to store for the trial
				var trial_data = {
					"rt": response.rt,
					"stimulus": trial.stimuli,
					"key_press": response.key
				};

				jsPsych.data.write($.extend({}, trial_data, trial.data));

				// clear the display
				display_element.html('');

				// move on to the next trial
				if (trial.timing_post_trial > 0) {
					setTimeout(function() {
						jsPsych.finishTrial();
					}, trial.timing_post_trial);
				} else {
					jsPsych.finishTrial();
				}
			};

			// function to handle responses by the subject
			var after_response = function(info) {
				console.log("HI");
				// after a valid response, the stimulus will have the CSS class 'responded'
				// which can be used to provide visual feedback that a response was recorded
				$("#jspsych-stim-sequence-stimulus").addClass('responded');

				// only record the first response
				if(response.key == -1){
					response = info;
				}

				if (trial.continue_after_response) {
					console.log("ended intentionally");
					end_trial();
				}
			};

			// start the response listener

			if(trial.choices != "none") {
				// start the response listener when it should become legal
				var keyboardListener; 
				tResponse = setTimeout(function() {
					console.log(trial.choices);
					keyboardListener = jsPsych.pluginAPI.getKeyboardResponse(after_response, trial.choices); }, trial.resp_onset); 
				setTimeoutHandlers.push(tResponse); 
			
			// end trial if time limit is set
			if (trial.resp_offset > 0) {
				var t2 = setTimeout(function() {
					console.log("timed out");
					end_trial();
				}, trial.resp_onset + trial.resp_offset);
				setTimeoutHandlers.push(t2);
			}

		}
	};

	return plugin;
})();
})(jQuery);
