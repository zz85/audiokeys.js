/***
 * AudioKeys.js - a simple audio levels extractor for both
 * Audio Data API (firefox) and Web Audio API (chrome/webkits browsers)
 *
 * @author https://github.com/zz85 | http://www.lab4games.net/zz85
 *  http://twitter.com/blurspline
 */

var AudioKeys = function(url) {
	
	var fftSize = 2048, context ;
	
	this.bins = 512;
	
	this.url = url;
	
	this.context = (context === undefined) ? new webkitAudioContext() : context;
	this.source = this.context.createBufferSource();
	this.analyzer = this.context.createAnalyser();
	
	this.analyzer.fftSize = fftSize;
    this.fftSize = 2048;
  	this.buffer = 0;

	
	this.watchers = [];
	
	this.data = new Uint8Array(fftSize);
  	this.isPlaying = false;

};

AudioKeys.prototype.load = function(callback) {
	var request = new XMLHttpRequest();
	var audio = this;
	request.open("GET", this.url, true);
	request.responseType = "arraybuffer";
	request.onload = function() {
		audio.buffer = audio.context.createBuffer(request.response, true);
		audio.reload();
		if (callback) callback();
	}

	request.send();
};

AudioKeys.prototype.play = function(time) {

	if (time===undefined) time = 0;
	if (this.startTimeAt) {
		this.startTimeAt = this.context.currentTime - this.startTimeAt;
	} else {
		this.startTimeAt = this.context.currentTime;
	}
	
	var source = this.getSource();
	
	// Route audio 
  	this.source.connect(this.analyzer);
	this.analyzer.connect(this.context.destination);

	//this.reload(); // run this to return to the start of time
    source.noteOn(time);
	this.isPlaying = true;
	
	
    // noteGrainOn - do not use :(
	//var timeleft = this.buffer.duration - time;
	//console.log(time, this.buffer.duration);
    //source.noteGrainOn(0, time,  timeleft);
	
};
AudioKeys.prototype.forward = function() {
	// forward 5 seconds
	//this.buffer.length
    //audio.source.playbackRate.value = 8
    this.source.playbackRate.value = 4;

    // duration /length
}

AudioKeys.prototype.normal = function() {
    this.source.playbackRate.value = 1;
}

AudioKeys.prototype.backward = function() {

};

/* Return current playing time in seconds */
AudioKeys.prototype.getCurrentTime = function() {
	if (!this.startTimeAt) { return 0; }
	return this.context.currentTime - this.startTimeAt;
};

// Pause audio
AudioKeys.prototype.stop = function() {
	this.startTimeAt = this.getCurrentTime();
	this.getSource().disconnect();
	this.isPlaying = false;
    //this.source.noteOff();
};

AudioKeys.prototype.pause = function() {
	console.log('Playing time', this.getCurrentTime());
	if (this.isPlaying) {
		this.stop();
	} else {
		this.play();
	}
};


AudioKeys.prototype.addWatchers = function(fromFreq, toFreq, lowLimit, highLimit) {
	this.watchers.push( [fromFreq, toFreq, lowLimit, highLimit] );
};

// Get levels / amptitudes
AudioKeys.prototype.getLevels1 = function(i) {
  	// Options - peak, average
	// which bars?
	this.process();
	var watcher = this.watchers[i];
	var startBin = watcher[0], 
		endBin = watcher[1],
		lowLimit = watcher[2],
		highLimit = watcher[3];
	
	var i = endBin;
	
	var average = 0;
	var sum = 0;
	var bins = endBin - startBin + 1;
    
	binValues = this.binValues;
	
	for ( ;i >= startBin; i--) {
		sum += binValues[i];
	}
	
	
	average = sum / bins / 256;
	//console.log('sum', sum, average);
	
	return average;
};



AudioKeys.prototype.getLevels = function(i) {
  	// Options -  average (/peaks)
	
	var watcher = this.watchers[i];
	var startBin = watcher[0], 
		endBin = watcher[1],
		lowLimit = watcher[2], //  values (/percent)
		highLimit = watcher[3];
	
    // bins or absolute?
    var fftBins = this.analyzer.frequencyBinCount;
    
	var i = endBin;
	
	var average = 0;
	var sum = 0;
	var bins = endBin - startBin + 1;
    
	binValues = this.data;
    
    // use bins 
    var value;
	for ( ;i >= startBin; i--) {
        value = binValues[i];
         
        if (highLimit && (value > highLimit)) {
            value = highLimit;
            // clipping         
        }
        
        if (lowLimit) {
            
            if (value < lowLimit) {
                value = 0;
            } else {
                value -= lowLimit;
            }
        
        }
       
         
		sum += value;
	}
	
	var range = 256
    if (highLimit) range = highLimit;
    if (lowLimit) range -= lowLimit;
    
	average = sum / bins / range;
	//console.log('sum', sum, average);
	
	return average;
};

AudioKeys.prototype.process = function() {
	var data = this.data;
	var analyzer = this.analyzer;
	
    analyzer.getByteFrequencyData(data);
    
    /*
	var bars = this.bars, sum, i, j, amp;
	
	var binSize = Math.floor(analyzer.frequencyBinCount / bars);
	// use average method to get bars

	
	var binValues = [];
	for (i=0; i < bars; ++i) {
		sum = 0;
		for (j=0; j < binSize; ++j) {
			amp = data[(i * binSize) + j];
			sum += amp;
		}
		binValues[i] = sum / binSize;
	}
	
	this.binValues = binValues;
    */
	
};

AudioKeys.prototype.getVisualizer = function() {
  //TODO
};

AudioKeys.prototype.getSource = function() {
  return this.source;
};

AudioKeys.prototype.reload = function(callback) {
  this.source.buffer = this.buffer;
};

var MozAudioKeys = function(url) {
	var audio = new Audio();
	audio.src = url;
	this.audio = audio;
	
	this.watchers = [];
	
	var thisClass = this;
	audio.addEventListener('loadedmetadata', function() {
		thisClass.audioInfo.call(thisClass);
	}, false);
	
	audio.addEventListener('MozAudioAvailable', function(event) {
		thisClass.audioAvailable.call(thisClass, event);
	}, false);
	
};

MozAudioKeys.prototype.audioInfo = function() {
    // console.log("got audio info");
    
	this.channels = this.audio.mozChannels;
	this.rate = this.audio.mozSampleRate;
	this.frameBufferLength = this.audio.mozFrameBufferLength;
	this.fftSize = this.frameBufferLength / this.channels;
	     
    if (self.FFT !== undefined) {
        this.ready.call(this);
    }
};

MozAudioKeys.prototype.audioAvailable = function(event) {
	var samples, time, signal;
	
	samples = event.frameBuffer;
	time = event.time;
	
	
	signal = DSP.getChannel(DSP.MIX, samples);
	//this.samples = samples;
    this.signal = signal;



};

MozAudioKeys.prototype.ready = function() {
	this.fft = new FFT(this.fftSize, this.rate);	
};


MozAudioKeys.prototype.load = function(callback) {
	
	// Makes sures DFT is loaded.
	var url = 'dsp.js';
	var element;
    element=document.createElement("script");
    element.setAttribute("language","javascript");
    element.setAttribute("src", url );

	var thisClass = this;
    element.onreadystatechange= function () {
        if (this.readyState == 'complete') {
            thisClass.ready.call(thisClass);
        }
    }
	element.onload = function() { 		
		if (thisClass.frameBufferLength) 
            thisClass.ready.call(thisClass);
			
    	if (callback) callback();
		
    };


  	var head=document.querySelector("head");
  	if(head.innerHTML.indexOf(element.outerHTML)!=-1){
		window.console && window.console.warn("Duplicate include, skipping:",url);
	}else{
		head.appendChild(element);
	}

};


MozAudioKeys.prototype.play = function() {
	this.audio.play();
};

MozAudioKeys.prototype.stop = function() {
	this.audio.stop();
};

MozAudioKeys.prototype.forward = function() {
	this.audio.currentTime += 5;
};

MozAudioKeys.prototype.getCurrentTime = function() {
	return this.audio.currentTime;
};

// MozAudioKeys.prototype.addWatchers = AudioKeys.prototype.addWatchers;
// Quick hack
MozAudioKeys.prototype.addWatchers = function(fromFreq, toFreq, lowLimit, highLimit) {
	this.watchers.push( [Math.floor(fromFreq/2), Math.floor(toFreq/2), lowLimit, highLimit] );
};

// Get levels / amptitudes
MozAudioKeys.prototype.getLevels1 = function(i) {
	
	if (!this.fft) return 0;

	var watcher = this.watchers[i];
	var startBin = watcher[0], 
		endBin = watcher[1],
		lowLimit = watcher[2],
		highLimit = watcher[3];

	var average = 0;
	var sum = 0;
	
	var totalBins = 32;
	
	var spectrum = this.data;
	
	startBin = Math.floor(startBin/totalBins * spectrum.length);
	endBin = Math.floor(endBin/totalBins * spectrum.length);
	var i = endBin;
	
	var bins = endBin - startBin + 1;
	
	for ( ;i >= startBin; i--) {
		sum += spectrum[i];
	}


	average = sum / bins * 50;
	//console.log('sum', sum, average);

	return average;
	
	
}

MozAudioKeys.prototype.getLevels = function(i) {
    if (!this.data) return 0;
    
	var watcher = this.watchers[i];
	var startBin = watcher[0], 
		endBin = watcher[1],
		lowLimit = watcher[2], 
		highLimit = watcher[3];
	
    // bins or absolute?
    var i = endBin;
	
	var average = 0;
	var sum = 0;
	var bins = endBin - startBin + 1;
    
	var binValues = this.data;
   
 	// TODO normalize between values of dB to maintain compatibility with Web Audio API 
    var baseDecibels = 60;
    var minDecibels = -50;
    var maxDecibels = -10;
    XdbMax =  20* Math.log(baseDecibels+maxDecibels) / Math.log(10);
    dBmin = 20* Math.log(baseDecibels+minDecibels) / Math.log(10); 

        
    // use bins 
    var value;
	for ( ;i >= startBin; i--) {
        value = binValues[i];
        
        //value *= -1 * Math.log((binValues.length - i) * (0.5/binValues.length )) *binValues.length * 2 ; 
        // Just cheat a bit right now and multiply them
        value *= 25000; 
       	
        if (highLimit && (value > highLimit)) {
            value = highLimit;
            // clipping         
        }
        
        if (lowLimit) {
            
            if (value < lowLimit) {
                value = 0;
            } else {
                value -= lowLimit;
            }
    
        }
               
		sum += value;
	}
	
	var range = 256;
    if (highLimit) range = highLimit;
    if (lowLimit) range -= lowLimit;
    
	average = sum / bins / range;
	//console.log('sum', sum, average);
	
	return average;
};



MozAudioKeys.prototype.process = function() {
	if (!this.fft || !this.signal) return;
	this.fft.forward(this.signal);
    this.data = this.fft.spectrum;
};

if (window.webkitAudioContext === undefined) {
	if ((new Audio()).mozSetup !== undefined) {
		AudioKeys = MozAudioKeys;
	} else {
		// we could use SoundManager 2 flash fallback,
        // although if audio is not enabled, webgl is probably not too.
        console.log('Audio API not supported. Perhaps use an updated version of Chrome or Firefox?');
	}
	
}
