'use strict';
(function() {
  Helpers.validateSaveVersion();

  var game = new Game.Game();
  game.load();

  var lab = game.lab;
  var research = game.research;
  var workers = game.workers;
  var upgrades = game.upgrades;
  var achievements = game.achievements;
  var allObjects = game.allObjects;
  var lastSaved;

  var app = angular.module('particleClicker', []);

  app.filter('niceNumber', ['$filter', function($filter) {
      return Helpers.formatNumberPostfix;
  }]);

  app.filter('niceTime', ['$filter', function($filter) {
      return Helpers.formatTime;
  }]);

  app.filter('currency', ['$filter', function($filter) {
    return function(input) {
      return 'JTN ' + $filter('niceNumber')(input);
    };
  }]);

  app.filter('reverse', ['$filter', function($filter) {
    return function(items) {
      return items.slice().reverse();
    };
  }]);

  app.controller('DetectorController', function() {
    this.click = function() {
      lab.clickDetector();
      detector.addEvent();
      UI.showUpdateValue("#update-data", lab.state.detector);
      return false;
    };
  });

  // Hack to prevent text highlighting
  document.getElementById('detector').addEventListener('mousedown', function(e) {
    e.preventDefault();
  });

  app.controller('LabController', ['$interval', function($interval) {
    this.lab = lab;
    this.showDetectorInfo = function() {
      if (!this._detectorInfo) {
        this._detectorInfo = Helpers.loadFile('html/detector.html');
      }
      UI.showModal('Detector', this._detectorInfo);
    };
    $interval(function() {  // one tick
      var grant = lab.getGrant();
      UI.showUpdateValue("#update-funding", grant);
      var sum = 0;
      for (var i = 0; i < workers.length; i++) {
        sum += workers[i].state.hired * workers[i].state.rate;
      }
      if (sum > 0) {
        lab.acquireData(sum);
        UI.showUpdateValue("#update-data", sum);
        detector.addEventExternal(workers.map(function(w) {
          return w.state.hired;
        }).reduce(function(a, b){return a + b}, 0));
      }
    }, 1000);
  }]);

  app.controller('ResearchController', ['$compile', function($compile) {
    this.research = research;
    this.isVisible = function(item) {
      return item.isVisible(lab);
    };
    this.isAvailable = function(item) {
      return item.isAvailable(lab);
    };
    this.doResearch = function(item) {
      var cost = item.research(lab);
      if (cost > 0) {
        UI.showUpdateValue("#update-data", -cost);
        UI.showUpdateValue("#update-reputation", item.state.reputation);
      }
    };
    this.showInfo = function(r) {
      UI.showModal(r.name, r.getInfo());
      UI.showLevels(r.state.level);
    };
  }]);

  app.controller('HRController', function() {
    this.workers = workers;
    this.isVisible = function(worker) {
      return worker.isVisible(lab);
    };
    this.isAvailable = function(worker) {
      return worker.isAvailable(lab);
    };
    this.hire = function(worker) {
      var cost = worker.hire(lab);
      if (cost > 0) {
        UI.showUpdateValue("#update-funding", -cost);
      }
    };
  });

  app.controller('UpgradesController', function() {
    this.upgrades = upgrades;
    this.isVisible = function(upgrade) {
      return upgrade.isVisible(lab, allObjects);
    };
    this.isAvailable = function(upgrade) {
      return upgrade.isAvailable(lab, allObjects);
    };
    this.upgrade = function(upgrade) {
      if (upgrade.buy(lab, allObjects)) {
        UI.showUpdateValue("#update-funding", upgrade.cost);
      }
    }
  });

  app.controller('AchievementsController', function($scope) {
    $scope.achievements = achievements;
    $scope.progress = function() {
      return achievements.filter(function(a) { return a.validate(lab, allObjects, lastSaved); }).length;
    };
  });

  app.controller('SaveController',
      ['$scope', '$interval', function($scope, $interval) {
    lastSaved = new Date().getTime();
    $scope.lastSaved = lastSaved;
    $scope.saveNow = function() {
      var saveTime = new Date().getTime();
      game.lab.state.time += saveTime - lastSaved;
      game.save();
      lastSaved = saveTime;
      $scope.lastSaved = lastSaved;
    };
    $scope.restart = function() {
      if (window.confirm(
        'Do you really want to restart the game? All progress will be lost.'
      )) {
        ObjectStorage.clear();
        window.location.reload(true);
      }
    };
    $interval($scope.saveNow, 10000);
  }]);

  app.controller('StatsController', function($scope) {
    $scope.lab = lab;
  });



  var sec = 0,
  min = 1,
  hour = 1;
  var secVar, minVar, hourVar;

  function setSec() {
  if (sec >= 60) {
  setMin();
  sec = 0;
  }
  if (sec < 10) {
  document.getElementById("sec").innerHTML = "0" + sec;
  } else {
  document.getElementById("sec").innerHTML = sec;
  }
  sec = sec + 1;
  secVar = setTimeout(setSec, 1000);
  }

  function setMin() {
  if (min >= 60) {
  setHour();
  min = 0;
  }
  if (min < 10) {
  document.getElementById("min").innerHTML = "0" + min;
  } else {
  document.getElementById("min").innerHTML = min;
  }
  min = min + 1;

  }

  function setHour() {
  if (hour < 10) {
  document.getElementById("hour").innerHTML = "0" + hour;
  } else {
  document.getElementById("hour").innerHTML = hour;
  }
  hour = hour + 1;
  }

  setSec();



  app.controller('MainCtrl', function($scope, $interval) {
  $scope.CountDown = {
    minutes: 0,
    seconds: 0,
    getTimeRemaining: function(endtime) {
      var t = Date.parse(endtime) - Date.parse(new Date());
      var minutes = Math.floor((t / 1000 / 60) % 60);
      var seconds = Math.floor((t / 1000) % 60);
      return {
        'minutes': minutes,
        'seconds': seconds,
      };
    },

    initializeClock: function(endtime) {
      function updateClock() {
        var t = $scope.CountDown.getTimeRemaining(endtime);
        $scope.CountDown.minutes = ('0' + t.minutes).slice(-2);
        $scope.CountDown.seconds = ('0' + t.seconds).slice(-2);

        if (t.total <= 0) {
          $interval.cancel(timeinterval);
        }
      }

      updateClock();
      var timeinterval = $interval(updateClock, 1000);
    }
  }

  var deadline = new Date(Date.parse(new Date()) + 2 * 12 * 60 * 60 * 1000);
  $scope.CountDown.initializeClock(deadline);
});







  analytics.init();
  analytics.sendScreen(analytics.screens.main);
})();
