Template.eventList.list = function () {
  return Events.find({}, {sort: { date: 1 }});
};

function eventDetailsReset() {
    Session.set('distributing_codes', false);
    Session.set('lastInviterId', 'nobody');
    $("#addNameTxt, #numNewCodes").val("");
}

Template.eventList.events({
  'click li': function () {
    Session.set('event_id', this._id);
    Session.set('editing_event', false);
    eventDetailsReset();
  },
  'click #addEvent': function () {
    Session.set('event_id', null);
    Session.set('editing_event', true);
    eventDetailsReset();
  }
});

Template.editEvent.events({
  'click #saveEvent': function (e) {
    e.preventDefault();
    var data = {name: $('#eventName').val(), date: new Date($('#eventDate').val())};
    if (selectedEvent()) {
      Events.update({_id: selectedEvent()._id}, {$set: data});
    } else {
      data.companyId = company()._id;
      data.userId = Meteor.userId();
      Events.insert(data);
    }
    Session.set('editing_event', false);
  },
  'click #deleteEvent': function (e) {
    e.preventDefault();
    if (confirm('Are you sure you want to delete this event?')) {
        var eventId = Session.get('event_id');
        Session.set('event_id', null);
        Session.set('editing_event', false);
        Events.remove({_id: eventId});
    }
    e.target.blur();
  },
  'change #eventDate': function(e) {
    $('#saveEvent').prop('disabled', !$(e.target).val());
  }
});

Template.editEvent.existing = Template.dashboard.showEventDetails = function () {
  return !!selectedEvent();
};

Template.eventDetails.name = function () {
  return selectedEvent() && selectedEvent().name;
};

function ensureInviterId(idOrName) {
  if (idOrName == 'nobody') {
    Session.set('lastInviterId', idOrName);
    idOrName = '';
  } else if (!Inviters.findOne(idOrName)) {
    idOrName = Inviters.insert({name: idOrName, companyId: company()._id});
    Session.set('lastInviterId', idOrName);
  }
  return idOrName;
}

Template.setCompanyName.events({
  'click #setCompanyName': function(e) {
    Meteor.call('set_company_name', $('#companyName').val());
  }
});

Template.eventDetails.rendered = function() {
  $("#addNameTxt").autosize();
}

Template.eventDetails.events({
  'click #newInviter': function (e) {
    e.preventDefault();
    Session.set('new_inviter', true);
  },
  'click #generateCodes': function (e) {
    e.preventDefault();
    var inviterId = ensureInviterId($('#inviterSelect').val());
    var numNewCodes = $('#numNewCodes').val();
    if (inviterId != '' && numNewCodes > 0 && Template.eventDetails.numnobody() > 0) {
        if (confirm('Use ' + Math.min(Template.eventDetails.numnobody(), numNewCodes) + ' codes currently assigned to "Nodody (forehanded)"?')) {
            var codeIds = [];
            _.each(Codes.find().fetch(), function(code) {
                if (code.inviterId == "" && !_.has(code, "usedAt") && numNewCodes > 0) {
                    numNewCodes--;
                    codeIds.push(code._id);
                    Codes.update({_id: code._id}, {$set: {inviterId: inviterId}});
                }
            });
            //Codes.update({_id: {$in: codeIds}}, {$set: {inviterId: inviterId}});
        }
    }
    if (numNewCodes > 0) {
        Meteor.call('generate_codes', selectedEvent()._id, inviterId, numNewCodes, $('#corpusSelect').val());
    }
    $('#numNewCodes').val('');
    e.target.blur();
  },
  'click #addName': function (e) {
    e.preventDefault();
    _.each($('#addNameTxt').val().split("\n"), function(code) {
      if (code = code.trim()) {
        Codes.insert({code: code, eventId: selectedEvent()._id, inviterId: ensureInviterId($('#inviterSelect').val()), userId: Meteor.userId()});
      }
    });
    $('#addNameTxt').val('');
    e.target.blur();
  },
  'click #editEvent': function (e) {
    e.preventDefault();
    Session.set('editing_event', !Session.get('editing_event'));
    Session.set('distributing_codes', false);
  },
  'click #distribute': function (e) {
    e.preventDefault();
    Session.set('editing_event', false);
    Session.set('distributing_codes', !Session.get('distributing_codes'));
  },
  'keydown input': function (e) {
    if (e.keyCode == 13) {
      e.preventDefault();
      return false;
    }
  }
});

Template.distributeCodes.inviters = function() {
  var ret = [];
  _.each(_.groupBy(_.reject(Codes.find().fetch(), function(code) { return code.inviterId == ""; }), 'inviterId'), function(codes, id) {
    var newCount = _.size(_.reject(codes, function(code) { return _.has(code, 'sentAt'); }));
    ret.push({inviter: Inviters.findOne(id), totalCount: _.size(codes), newCount: newCount});
  });
  return _.sortBy(ret, "newCount").reverse();
}

Template.distributeCodes.events({
  'click #sendCodes': function (e) {
    e.preventDefault();
    $(':checked', '#distributeForm').each(function() {
      var input = $(this).closest('.form-group').find('input[type="email"]');
      Meteor.call('send_codes', selectedEvent()._id, input.attr('data-inviterid'), input.val());
      $(this).prop('checked', false);
    });
    $('#sendCodes').addClass('disabled');
  },
  'change :checkbox': function() {
    var numChecked = 0;
    $(':checkbox', '#distributeForm').each(function() {
      var required = false;
      if ($(this).is(':checked')) {
        numChecked++;
        required = true;
      }
      $(this).closest('.form-group').find('input[type="email"]').prop('required', required);     
    });
    $('#sendCodes').toggleClass('disabled', numChecked == 0);
  },
});

Template.distributeCodes.rendered = function() {
    var numChecked = $('label.hasNewCodes :checkbox', '#distributeForm').prop('checked', true).size();
    $('#sendCodes').toggleClass('disabled', numChecked == 0);
}

Template.eventDetails.numcodes = function () {
  return _.reject(Codes.find().fetch(), function(code) { return code.inviterId == ""; }).length || 0;
};

Template.eventDetails.numnobody = function () {
  return _.reject(Codes.find().fetch(), function(code) { return code.inviterId != "" || _.has(code, "usedAt"); }).length || 0;
};

Template.eventDetails.numinviters = function () {
  return _.size(_.groupBy(_.reject(Codes.find().fetch(), function(code) { return code.inviterId == ""; }), 'inviterId')) || 0;
};

Template.eventDetails.numused = function () {
  return _.filter(Codes.find().fetch(), function(code) { return _.has(code, "usedAt"); }).length || 0;
};

Template.inviterSelect.rendered = function () {
  this.myDeps1 = Deps.autorun(function () {
    var inviters = [{id: 'nobody', text: 'Nobody (forehanded)'}];
    Inviters.find().forEach(function (inviter) {
        inviters.push({id: inviter._id, text: inviter.name});
    });

    $('#inviterSelect').select2({
      createSearchChoice: function(term, data) {
        if ($(data).filter(function() { 
          return this.text.localeCompare(term)===0; }).length===0) {return {id: term, text: 'New: ' + term};
        }
      },
      data: inviters
    })
  });
  this.myDeps2 = Deps.autorun(function () {
    $('#inviterSelect').select2("val", Session.get('lastInviterId'));
  });
}

Template.inviterSelect.destroyed = function () {
  this.myDeps1.stop();
  this.myDeps2.stop();
};

Template.corpusSelect.list = function() {
    return _.map(corpusInfo, function(value, key) { return {key: key, value: value} });
}

UI.registerHelper('editingEvent', function(block) {
    return Session.get('editing_event');
});

UI.registerHelper('distributingCodes', function(block) {
    return Session.get('distributing_codes');
});
