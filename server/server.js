corpusData = {};

function getCompanyId(userId) {
    if (userId) {
      var user = Meteor.users.findOne(userId);
      return user.companyId;
    }
    return null;
}

Meteor.publish("userData", function () {
  return Meteor.users.find({_id: this.userId}, {fields: {'companyId': 1}});
});

// publish the current company.
Meteor.publish('company', function (companyId) {
  if (companyId && getCompanyId(this.userId) == companyId) {
    return Companies.find({_id: companyId});
  }
});

// publish all events by current company.
Meteor.publish('events', function (companyId) {
  if (companyId && getCompanyId(this.userId) == companyId) {
    return Events.find({companyId: companyId});
  }
});

// publish all inviters by current company.
Meteor.publish('inviters', function (companyId) {
  if (companyId && getCompanyId(this.userId) == companyId) {
    return Inviters.find({companyId: companyId});
  }
});

// publish all codes for the selected event.
Meteor.publish('codes', function (eventId) {
  var event = Events.findOne(eventId);
  if (event && event.companyId == getCompanyId(this.userId)) {
    return Codes.find({eventId: eventId});
  }
});

Events.allow({
  insert: function (userId, doc) {
    return (userId && doc.userId == userId && doc.companyId === getCompanyId(userId));
  },
  update: function (userId, doc, fields, modifier) {
    return (userId && doc.companyId === getCompanyId(userId));
  },
  remove: function (userId, doc) {
    return (userId && doc.companyId === getCompanyId(userId));
  },
  fetch: ['companyId']
});

Inviters.allow({
  insert: function (userId, doc) {
    return (userId && doc.companyId === getCompanyId(userId));
  },
  update: function (userId, doc, fields, modifier) {
    return (userId && doc.companyId === getCompanyId(userId));
  },
  remove: function (userId, doc) {
    return (userId && doc.companyId === getCompanyId(userId));
  },
  fetch: ['companyId']
});

Codes.allow({
  insert: function (userId, doc) {
    return (userId && userId == doc.userId && Events.findOne(doc.eventId).companyId === getCompanyId(userId));
  },
  update: function (userId, doc, fields, modifier) {
    if (_.intersection(fields, ["userId","code","sentAt"]).length) {
      return false; // tried to write to forbidden field
    }
    return (userId && Events.findOne(doc.eventId).companyId === getCompanyId(userId));
  },
  remove: function (userId, doc) {
    return (userId && Events.findOne(doc.eventId).companyId === getCompanyId(userId));
  },
  fetch: ['eventId']
});


Meteor.methods({
  set_company_name: function(name) {
    var companyId = getCompanyId(this.userId);
    if (companyId) {
      Companies.update({_id: companyId}, {$set: {name: name}});
    } else {
      companyId = Companies.insert({name: name});
      Meteor.users.update({_id: this.userId}, {$set: {companyId: companyId}});
    }
  },
  generate_codes: function (eventId, inviterId, numNewCodes, corpus) {
    if (!_.has(corpusInfo, corpus)) {
        throw new Meteor.Error(403, "No such corpus");
    }
    if (Number(numNewCodes) > 99) {
        throw new Meteor.Error(403, "Can't generate that many codes at once");
    }
    if (Events.findOne(eventId).companyId !== getCompanyId(this.userId)) {
        throw new Meteor.Error(403, "No such event");
    }
    if (!corpusData[corpus]) {
        corpusData[corpus] = JSON.parse(Assets.getText(corpus + ".json"));
    }
    for (var i = 0; i < numNewCodes; i++) {
        var adjective = Random.choice(corpusData[corpus].adjectives);
        var noun; 
        if (corpusData[corpus].lang == "de") {
            noun = Random.choice(_.keys(corpusData[corpus].nouns));
            adjective += corpusData[corpus].nouns[noun] == 'f' ? 'e' : 'er';
        } else {
            noun = Random.choice(corpusData[corpus].nouns);
        }
        var digits = '';
        if (corpusData[corpus].digits > 0) {
            digits = _.sprintf(' %0' + corpusData[corpus].digits + 'd', Math.floor(Math.random() * Math.pow(10, corpusData[corpus].digits)));
        }
        Codes.insert({eventId: eventId, code: adjective + ' ' + noun + digits, inviterId: inviterId, userId: this.userId});
    }
  },
  send_codes: function (eventId, inviterId, email) {
    var event = Events.findOne(eventId);
    var inviter = Inviters.findOne(inviterId);
        
    if (!event || event.companyId !== getCompanyId(this.userId)) {
        throw new Meteor.Error(403, "No such event");
    }
    
    if (!inviter || inviter.companyId !== getCompanyId(this.userId)) {
        throw new Meteor.Error(403, "No such inviter");
    }

    var now = new Date();
    Codes.update({eventId: eventId, inviterId: inviterId, sentAt: {$exists: false}}, {$set: {sentAt: now}}, {multi: true});
    Inviters.update({_id: inviterId}, {$set: {email: email}});

    var codes = Codes.find({eventId: eventId, inviterId: inviterId}, {sort: {usedAt: 1, sentAt: -1, code: 1}}).fetch();
    if (codes.length == 0) {
        throw new Meteor.Error(403, "This inviter does not have codes for this event");
    }
    var isResend = _.size(_.groupBy(codes, "sentAt")) > 1;
    var company = Companies.findOne(event.companyId);
    var subject = '';
    var body = '';
    if (codes.length == 1) {
        subject = 'Your guest list spot for ' + company.name + ' is ready';
        body += 'Here is your guest list spot';
    } else {
        subject = 'Your guest list spots for ' + company.name + ' are ready';
        body += 'Here are your ' + codes.length + ' guest list spots';
    }
    body += ' for the upcoming event at ' + company.name + ':\n\n';
    body += 'Event name: ' + event.name + '\n';
    body += 'Event date: ' + moment(event.date).format("dddd, MMMM Do YYYY") + '\n';
    body += 'List name: ' + inviter.name + '\n';
    body += '\n';
    _.each(codes, function(el) {
        if (_.has(el, "usedAt")) {
            body += "USED: ";
        } else if (isResend && el.sentAt.getTime() == now.getTime()) {
            body += "NEW: ";
        }
        body += el.code;
        body += '\n';
    });
    body += '\nFeel free to distribute these codes at your own discretion. Please note that each entrant should be able to state one code from the above list as well as the list name "' + inviter.name + '".';
    Email.send({to: email, from: 'nospf@nospf.mailrange.com', subject: subject, text: body});
  }
});
