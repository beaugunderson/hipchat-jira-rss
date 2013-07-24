## hipchat-jira-rss

Get HipChat notifications based on a Jira RSS feed. Useful when you don't have
administrative access to Jira or when you don't want to update your Jira
workflows.

### Instructions

* `cp example.env .env`
* Fill in the values in your `.env` file
* `npm install`
* Add some form of `foreman run node index.js` to your crontab
