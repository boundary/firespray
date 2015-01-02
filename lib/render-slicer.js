var renderSlicer = (function (func) {
	var _queue = [], // data to be rendered
		_rate = 1000, // number of calls per frame
		_invalidate = function () {}, // invalidate last render queue
		_onStartCallback = function () {}, // clearing function
		_isDone = false,
		_doneCallback, // all done
		_chunkDoneCallback, // chunk done
		_startQueueSize,
		_frameDoneCallback,
		_dataCountDone; // percent done

	var rq = function (data) {
		_isDone = false;
		if (data) rq.data(data);
		_invalidate();
		_onStartCallback();
		rq.render();
	};

	rq.render = function () {
		var valid = true;
		_invalidate = rq.invalidate = function () {
			valid = false;
		};

		function doFrame() {
			if (!valid) return true;
			if (!_isDone && _queue.length === 0 && _doneCallback) {
				_isDone = true;
				_doneCallback();
			}
			var chunk = _queue.splice(0, _rate);
			chunk.map(function(d){
				_dataCountDone++;
				if(_frameDoneCallback) _frameDoneCallback();
				func(d);
			});
			if(chunk.length > 0 && _chunkDoneCallback){
				_chunkDoneCallback();
			}
			timer_frame(doFrame);
		}

		doFrame();
	};

	rq.onStart = function (onStartCallback) {
		_onStartCallback = onStartCallback;
		return rq;
	};

	rq.onChunkDone = function (chunkDoneCallback) {
		_chunkDoneCallback = chunkDoneCallback;
		return rq;
	};

	rq.onFrameDone = function (frameDoneCallback) {
		_frameDoneCallback = frameDoneCallback;
		return rq;
	};

	rq.onDone = function (doneCallback) {
		_doneCallback = doneCallback;
		return rq;
	};

	rq.data = function (data) {
		_startQueueSize = data.length;
		_dataCountDone = 0;
		_invalidate();
		_queue = data.slice(0); // creates a copy of the data
		return rq;
	};

	rq.add = function (data) {
		_queue = _queue.concat(data);
	};

	rq.rate = function (value) {
		if (!arguments.length) return _rate;
		_rate = value;
		return rq;
	};

	rq.remaining = function () {
		return _queue.length;
	};

	rq.count = function(){
		return _dataCountDone;
	};

	rq.invalidate = _invalidate;

	var timer_frame = window.requestAnimationFrame
		|| window.webkitRequestAnimationFrame
		|| window.mozRequestAnimationFrame
		|| window.oRequestAnimationFrame
		|| window.msRequestAnimationFrame
		|| function (callback) { setTimeout(callback, 17); };

	return rq;
});