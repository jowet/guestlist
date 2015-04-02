Template.checkpoint.alphabeticalInviters = function() {
  return selectedEvent() && _.sortBy(_.keys(_.groupBy(Codes.find().fetch(), 'inviterId')), function (_id) {return (Inviters.findOne(_id) || {name: '~'}).name });
}

Template.checkpoint.alphabeticalCodes = function(inviterId) {
  if (selectedEvent()) {
      if (typeof inviterId != 'undefined') {
        return Codes.find({inviterId: inviterId}, {sort: {code: 1, _id: 1}});
      } else {
        return Codes.find({}, {sort: {code: 1, _id: 1}});
      }
  }
}

Template.checkpoint.events({
  'change input[name="mode"]': function (e) {
    Session.set('checkpoint_mode', $(e.target).val());
  }
});

Template.codeListEntry.showInvitedBy = function() {
    return Session.get('checkpoint_mode') == 'ungrouped' && Inviters.findOne(this.inviterId);
}

Template.codeListEntry.events({
  'click span': function () {
    if (!this.usedAt) {
      Codes.update({_id: this._id}, {$set: {usedAt: new Date}});
    }
  },
  'click .reactivate': function () {
    if (this.usedAt) {
      Codes.update({_id: this._id}, {$unset: {usedAt: ""}});
    }
  },
  'click .remove': function () {
    Codes.remove({_id: this._id});
  },
});

Session.setDefault('checkpoint_mode', 'ungrouped');

UI.registerHelper('codeList', function() {
  if (Session.get('checkpoint_mode') == 'grouped')
    return Template.codeListGrouped;
  else
    return Template.codeListUngrouped;
});
