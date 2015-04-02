company = function () {
  return Companies.findOne();
};

selectedEvent = function () {
  return Events.findOne(Session.get('event_id'));
};

Meteor.subscribe("userData");

// Events.update({_id: "xTXtBwhnLeLtQzzvS"}, {$push: {"codes": {code: "abc", inviterId: "3mWmaN6onXCWGu4Hi"}}})
// Inviters.insert({name: "Fabian Salomon", companyId: "HXrxushFouAYGijBk", email: "fabian@salomon-itc.com"})


Meteor.startup(function () {
  Deps.autorun(function() {
    Meteor.subscribe("codes", selectedEvent() && selectedEvent()._id);
  });
  Deps.autorun(function() {
    if (Meteor.user() && _.has(Meteor.user(), "companyId")) {
      Meteor.subscribe("company", Meteor.user().companyId);
      Meteor.subscribe("events", Meteor.user().companyId);
      Meteor.subscribe("inviters", Meteor.user().companyId);
    }
  });
});

UI.registerHelper("formatDate", function(timestamp) {
    return moment(new Date(timestamp)).format("dddd, MMMM Do YYYY");
});

UI.registerHelper("formatDateShort", function(timestamp) {
    return moment(new Date(timestamp)).format("DD.MM.YYYY");
});

UI.registerHelper("html5date", function(timestamp) {
    return moment(new Date(timestamp)).format("YYYY-MM-DD");
});

UI.registerHelper('selectedEvent', function(block) {
    return selectedEvent();
});

UI.registerHelper('company', function(block) {
    return company();
});

UI.registerHelper("inviterName", function(_id) {
    return (Inviters.findOne(_id) || {name: 'Nobody'}).name;
});
