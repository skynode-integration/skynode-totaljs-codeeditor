const Fs = require('fs');
const Path = require('path');

FUNC.makeignore = function(arr) {

	var ext;
	var code = ['if (P.indexOf(\'-bk.\')!==-1)return;var path=P.substring(0,P.lastIndexOf(\'/\')+1);', 'var ext=U.getExtension(P);', 'var name=U.getName(P).replace(\'.\'+ext,\'\');'];

	for (var i = 0; i < arr.length; i++) {
		var item = arr[i];
		var index = item.lastIndexOf('*.');

		if (index !== -1) {
			// only extensions on this path
			ext = item.substring(index + 2);
			item = item.substring(0, index);
			code.push('tmp=\'{0}\';'.format(item));
			code.push('if((!tmp||path===tmp)&&ext===\'{0}\')return;'.format(ext));
			continue;
		}

		ext = U.getExtension(item);

		// only filename
		index = item.lastIndexOf('/');
		code.push('tmp=\'{0}\';'.format(item.substring(0, index + 1)));
		code.push('if(path===tmp&&U.getName(\'{0}\').replace(\'.{1}\', \'\')===name&&ext===\'{1}\')return;'.format(item.substring(index + 1), ext));

		// all nested path
		var val = item.replace('*', '');
		val && code.push('if(path.startsWith(\'{0}\'))return;'.format(val));
	}

	code.push('return true');
	return new Function('P', code.join(''));
};

FUNC.autodiscover = function() {
	Fs.readdir(CONF.autodiscover || '/www/www/', function(err, directories) {

		var projects = MAIN.projects;
		var ischange = false;
		var cache = {};

		directories.wait(function(p, next) {

			p = U.path(p.replace(/\/\//g, '/').replace(/\\\\/g, '\\'));

			var model = {};
			model.path = Path.join(CONF.autodiscover, p);
			cache[model.path] = 1;

			Fs.stat(model.path, function(err, stat) {

				if (err || !stat.isDirectory()) {
					var index = projects.findIndex('path', model.path);
					if (index !== -1) {
						projects.splice(index, 1);
						ischange = true;
					}
					next();
					return;
				}

				var item = projects.findItem('path', model.path);
				if (item != null) {
					next();
					return;
				}

				model.name = p.substring(0, p.length - 1);

				var arr = model.name.replace(/_/g, '.').split('-');
				arr.reverse();

				model.url = 'https://' + arr.join('.');
				model.permissions = '';
				model.documentation = 'https://wiki.totaljs.com';
				model.support = 'https://messenger.totaljs.com';
				model.logfile = '';
				model.users = [];
				model.backup = true;
				model.skipsrc = true;
				model.skiptmp = true;
				model.skipnm = true;
				model.allowbundle = true;
				model.allowscripts = true;

				// new projects
				$SAVE('Projects', model, next);
			});
		}, function() {

			var remove;

			for (var i = 0; i < MAIN.projects.length; i++) {
				var project = MAIN.projects[i];
				if (project.path.substring(0, CONF.autodiscover.length) !== CONF.autodiscover)
					continue;
				if (!cache[project.path]) {
					if (!remove)
						remove = [];
					remove.push(project.id);
				}
			}

			if (remove) {
				remove.wait(function(id, next) {
					$REMOVE('Projects', { id: id, internal: true }, next);
				}, () => MAIN.save(2));
			} else
				ischange && MAIN.save(2);
		});
	});
};

CONF.autodiscover && ON('service', function(counter) {
	if (counter % 5 === 0)
		FUNC.autodiscover();
});