////////// Shared code (client and server) //////////

Router.configure({
    layoutTemplate: 'bootstrapWrapper'
});

Router.map(function() {
  this.route('dashboard', {path: '/'});
  this.route('checkpoint', {path: '/checkpoint/:_id', onRun: function() { Session.set('event_id', this.params._id); }});
});

Companies = new Meteor.Collection('companies');
Events = new Meteor.Collection('events');
Inviters = new Meteor.Collection('inviters');
Codes = new Meteor.Collection('codes');

corpusInfo = {
    german_positive_thesaurus: 'DE positive words from thesaurus (~ 105k combinations)',
    german_positive_frequent: 'DE positive and frequent words (~ 453k combinations)',
    german_positive: 'DE positive words (~ 980k combinations)',
    german_frequent: 'DE frequent words (~ 50m combinations)',
    english_coolaj86: 'EN animals+number (100k combinations)'
};
