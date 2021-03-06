var request = require('request');
var Entities = require('html-entities').AllHtmlEntities;

var entities = new Entities();

module.exports = {
  title: 'Reddit',
  description: '{{subreddit}} subreddit',
  filterDescription: '/r/{{subreddit}} posts over {{points}} points {{#unless selfPosts}}(no self posts){{/unless}}',

  source: {
    schema: {
      subreddit: {
        title: 'Subreddit',
        description: 'Subreddit name',
        type: 'string'
      }
    },

    validate: source => {
      var errors = {};

      if (!source.subreddit) {
        errors.subreddit = 'Subreddit is required.';
      } else if (!source.subreddit.match(/^(\/r\/)?[a-zA-Z0-9_]{1,21}$/)) {
        errors.subreddit = 'Invalid subreddit name.';
      }

      return errors;
    },

    clean: source => {
      source.subreddit = source.subreddit.replace('/r/', '').toLowerCase();
      return source;
    }
  },

  filter: {
    schema: {
      points: {
        title: 'Point Threshold',
        description: 'Minimum point value to include',
        type: 'integer'
      },
      selfPost: {
        title: 'Include Self Posts',
        type: 'boolean',
      }
    },

    validate: filter => {
      var errors = {};

      if (filter.points < 5) {
        errors.points = 'Point threshold must be 5 or higher.'
      }

      return errors;
    },

    clean: filter => {
      filter.selfPost = filter.selfPost || false;
      return filter;
    },

    test: (filter, link) => {
      return (link.meta.points >= filter.points &&
              (filter.selfPosts || !link.meta.selfPost));
    }
  },

  collect: (source, done) => {
    request({
      url: 'http://www.reddit.com/r/' + source.subreddit + '/top.json',
      json: true
    }, (err, res, body) => {
      if (err) {
        return done(err);
      }

      if (res.statusCode === 200) {
        var items = body.data.children;
        var links = [];

        items.forEach(item => {
          var link = {
            identifier: item.data.id,
            title: entities.decode(item.data.title),
            url: item.data.url,
            discussionUrl: 'http://www.reddit.com' + item.data.permalink,
            postTime: item.data.created_utc,
            meta: {
              points: item.data.score,
              selfPost: item.data.is_self
            }
          };

          links.push(link);
        });

        done(null, links);
      }
    });
  }
};
