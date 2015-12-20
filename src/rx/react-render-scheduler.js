var Rx = require('rx');
function __extends(d, b) {
  for (var p in b) {
    if (b.hasOwnProperty(p)) {
      d[p] = b[p];
    }
  }
  function __() {
    this.constructor = d;
  }

  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};

module.exports = (function MakeReactRenderScheduler(__super__) {
  function ReactRenderScheduler() {
    __super__.call(this);
    this.scheduled = [];
    this._lastId = -1;
    this.scheduledReadySubject = new Rx.Subject();
  }

  __extends(ReactRenderScheduler, __super__);

  function ScheduledDisposable(scheduled, handler) {
    this.scheduled = scheduled;
    this.handler = handler;
    this.isDisposed = false;
    this.actionDisposable = null;
    this.hasNew = false;
  }

  ScheduledDisposable.prototype.dispose = function dispose() {
    if (!this.isDisposed) {
      this.isDiposed = true;
      var idx = this.scheduled.indexOf(this.handler);
      if (idx === -1) {
        return;
      }
      this.scheduled.splice(idx, 1)
    }
  };

  ReactRenderScheduler.prototype.runScheduled = function runScheduled() {
    if (!this.hasNew) {
      return;
    }
    this.hasNew = false;

    var scheduled = this.scheduled;

    // Keep in mind that scheduled actions can be disposed of, or added to while processing
    // in this loop, so we can't use a traditional for loop or rely on stable length.
    while (scheduled.length > 0) {
      var next = scheduled.shift();
      try {
        next();
      } catch (e) {
        console.error(e);
      }
    }

    this.scheduled = [];
  };

  ReactRenderScheduler.prototype.scheduleAction =
    function scheduleAction(disposable, action, scheduler, state) {
      var handler = function schedule() {
        if (!disposable.isDiposed) {
          disposable.setDisposable(Rx.Disposable._fixup(action(scheduler, state)));
        }
      };

      this.scheduled.push(handler);

      this.hasNew = true;
      this.scheduledReadySubject.onNext(this._lastId++);
      return handler;
    };

  ReactRenderScheduler.prototype.schedule = function schedule(state, action) {
    var disposable = new Rx.SingleAssignmentDisposable();
    var handler = this.scheduleAction(disposable, action, this, state);
    var scheduledIdDisposable = new ScheduledDisposable(this.scheduled, handler);

    return Rx.Disposable.create(function dispose() {
      disposable.dispose();
      scheduledIdDisposable.dispose();
    });
  };

  ReactRenderScheduler.prototype._scheduleFuture = function _scheduleFuture(state, dueTime, action) {
    if (dueTime === 0) {
      return this.schedule(state, action);
    }

    var innerDisposable = new Rx.SingleAssignmentDisposable();
    var outerDisposable = new Rx.SingleAssignmentDisposable();

    var self = this;
    var timeoutHandle = setTimeout(function delayedSchedule() {
      var handler = self.scheduleAction(disposable, action, self, state);
      outerDisposable.setDisposable(new ScheduledDisposable(self.scheduled, handler))
    }, dueTime);

    return Rx.Disposable.create(function dispose() {
      innerDisposable.dispose();
      outerDisposable.dispose();
      clearTimeout(timeoutHandle);
    });
  };

  return ReactRenderScheduler;
}(Rx.Scheduler));
