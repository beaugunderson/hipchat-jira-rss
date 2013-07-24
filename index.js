var async = require('async');
var FeedParser = require('feedparser');
var HipChatClient = require('node-hipchat');
var levelup = require('level');
var request = require('request');
var _ = require('lodash');

if (!process.env.HIPCHAT_TOKEN) {
  console.log('Please configure your .env file.');

  process.exit(1);
}

var CATEGORIES = process.env.JIRA_CATEGORIES &&
  process.env.JIRA_CATEGORIES.split(',') || ['closed', 'created'];

var db = levelup('./seen');

var hipchat = new HipChatClient(process.env.HIPCHAT_TOKEN);

function sendMessage(message) {
  hipchat.postMessage({
    room: process.env.HIPCHAT_ROOM,
    from: process.env.HIPCHAT_FROM || 'Jira',
    message: message,
    color: process.env.HIPCHAT_COLOR || 'purple'
  }, function (result) {
    if (result.status !== 'sent') {
      console.log('Error', result);
    }
  });
}

/*
function getLink(item) {
  if (!item || !item["atom:link"]) {
    return false;
  }

  var links = item["atom:link"].filter(function (link) {
    return link["@"].rel === 'alternate';
  });

  if (links.length) {
    return links[0]["@"].href;
  } else {
    return false;
  }
}
*/

function getTitle(update) {
  var title = update["atom:title"]["#"] || update.title;

  title = title.replace(/ +/g, ' ');

  return title;
}

function isRelevant(update) {
  var goodCategories = update.categories.filter(function (category) {
    return _.contains(CATEGORIES, category);
  });

  return goodCategories.length || /changed the Assignee/.test(getTitle(update));
}

request.get(process.env.JIRA_RSS_URL)
  .auth(process.env.JIRA_USER, process.env.JIRA_PASSWORD)
  .pipe(new FeedParser())
  //.on('meta', function (meta) {})
  .on('readable', function () {
    var stream = this;
    var update;

    async.whilst(function () {
      update = stream.read();

      return update;
    }, function (cbWhilst) {
      if (!isRelevant(update)) {
        return process.nextTick(cbWhilst);
      }

      db.get(update.guid, function (err) {
        if (err) {
          db.put(update.guid, 'seen', function (err) {
            if (!err) {
              sendMessage(getTitle(update));
            }

            cbWhilst(err);
          });
        } else {
          console.log('Already seen', update.guid);

          cbWhilst();
        }
      });
    }, function (err) {
      if (err) {
        console.log('Error', err);
      }
    });
  });
