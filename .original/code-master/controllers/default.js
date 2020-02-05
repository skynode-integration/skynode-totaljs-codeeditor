const Fs = require('fs');

exports.install = function() {

	ROUTE('+GET /*', 'index', ['authorize']);
	ROUTE('-GET /*', 'login', ['unauthorize']);
	ROUTE('GET  /offline/');
	ROUTE('GET  /pause/');

	ROUTE('+GET /docs/{id}/', docs);

	// File routes
	FILE('/manifest.json', manifest);
};

function manifest(req, res) {
	res.content(200, '{"name":"{0}","short_name":"{0}","icons":[{"src":"/img/icon.png","sizes":"500x500","type":"image/png"}],"start_url":"/","display":"standalone"}'.format(CONF.name), U.getContentType('json'));
}

function docs(id) {

	var self = this;
	var project = MAIN.projects.findItem('id', id);
	if (project == null) {
		self.throw404();
		return;
	}

	if (!self.user.sa) {
		var user = project.users.indexOf($.user.id);
		if (!user) {
			self.throw401();
			return;
		}
	}

	NOSQL(id + '_parts').find().callback(function(err, response) {
		var docs = JSON.stringify(response);
		Fs.readFile(PATH.public('docs.html'), function(err, data) {
			data = data.toString('utf8').replace(/NAME/g, project.name).replace(/DATA/, docs);
			self.content(data, 'text/html');
		});
	});
}