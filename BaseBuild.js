Class.Define('BaseBuild', {
	Static: {
		BUILD_SCRIPTS_DIR: Wsh.Fso.GetAbsolutePathName('.').replace(/\\/g, '/'),
		GLOBAL_VERSION_NUMBER_FILENAME: 'GLOBAL_VERSION_NUMBER'
	},
	mainModuleDirName: '',
	subModuleDirsNameBegin: '',
	versions: [],
	modulesInfo: [],
	Constructor: function () {
		//
	},
	loadGlobalVersionNumber: function () {
		var fullPath = this.self.BUILD_SCRIPTS_DIR + '/' + this.self.GLOBAL_VERSION_NUMBER_FILENAME;
		var textStream = Wsh.Fso.OpenTextFile(fullPath, 1, 0); // for reading, as ASCII
		var versionNumStr = textStream.ReadLine().trim();
		textStream.Close();
		var versionNumStrParts = versionNumStr.split(".");
		for (var i = 0, l = versionNumStrParts.length; i < l; i += 1) {
			this.versions.push(
				parseInt(versionNumStrParts[i], 10)
			);
		}
	},
	completeModuleDirectoriesInfo: function () {
		var folder = Wsh.Fso.GetFolder("./.."),
			foldersEnum = new Enumerator(folder.subFolders),
			subFolder = {},
			lang = '',
			asmInfo = '',
			nugetCfgPath = '';
		for (; !foldersEnum.atEnd(); foldersEnum.moveNext()) {
			subFolder = Wsh.Fso.GetFolder(String(foldersEnum.item()));
			lang = '';
			asmInfo = '';
			if (subFolder.name.indexOf(this.subModuleDirsNameBegin) == 0 || subFolder.name == this.mainModuleDirName) {
				if (Wsh.Fso.FileExists(subFolder.path + '/My Project/AssemblyInfo.vb')) {
					lang = 'vb';
					asmInfo = subFolder.path + '/My Project/AssemblyInfo.vb';
				} else if (Wsh.Fso.FileExists(subFolder.path + '/Properties/AssemblyInfo.cs')) {
					lang = 'cs';
					asmInfo = subFolder.path + '/Properties/AssemblyInfo.cs';
				}
				if (!lang) continue;
				this.modulesInfo.push({
					lang: lang,
					dirFullPath: subFolder.path,
					dirName: subFolder.name,
					asmInfo: asmInfo,
					nugetCfg: this._tryToFindNugetConfigFile(subFolder.path),
					readme: this._tryToFindReadmeFile(subFolder.path)
				});
			}
		}
		this.modulesInfo.sort().reverse();
	},
	_tryToFindNugetConfigFile: function (dirFullPath) {
		var folder = Wsh.Fso.GetFolder(dirFullPath),
			filesEnum = new Enumerator(folder.files),
			file = {},
			fileExt = '',
			result = '';
		for (; !filesEnum.atEnd() ; filesEnum.moveNext()) {
			file = Wsh.Fso.GetFile(String(filesEnum.item()));
			fileExt = String(Wsh.Fso.GetExtensionName(file.Path)).toLowerCase();
			if (fileExt == 'nuspec') {
				result = file.Path;
				break;
			}
		}
		return result;
	},
	_tryToFindReadmeFile: function (dirFullPath) {
		var folder = Wsh.Fso.GetFolder(dirFullPath),
			filesEnum = new Enumerator(folder.files),
			file = {},
			fileName = '',
			result = '';
		for (; !filesEnum.atEnd() ; filesEnum.moveNext()) {
			file = Wsh.Fso.GetFile(String(filesEnum.item()));
			fileName = String(file.Name).toUpperCase();
			if (fileName == 'README.MD') {
				result = file.Path;
				break;
			}
		}
		return result;
	},
	cleanAllBinDirectoriesForNupkgs: function () {
		var dirFullPath = '';
		for (var i = 0, l = this.modulesInfo.length; i < l; i += 1) {
			dirFullPath = this.modulesInfo[i].dirFullPath;
			this.cleanDirectory(dirFullPath + '/bin/Debug');
			this.cleanDirectory(dirFullPath + '/bin/Release');
		}
	},
	setUpVersionToAssemblyInfos: function () {
		var readStream = null,
			writeStream = null,
			asmInfoFullPath = '',
			asmInfoContent = '';
		for (var i = 0, l = this.modulesInfo.length; i < l; i += 1) {
			asmInfoFullPath = this.modulesInfo[i].asmInfo;
			// open for reading, if file doesn't exists, do not create new
			readStream = Wsh.Fso.OpenTextFile(asmInfoFullPath, 1, false);
			asmInfoContent = readStream.ReadAll();
			readStream.Close();
			asmInfoContent = this._setUpVersionToAssemblyInfoContent(asmInfoContent, 'AssemblyVersion');
			asmInfoContent = this._setUpVersionToAssemblyInfoContent(asmInfoContent, 'AssemblyFileVersion');
			// for overwriting, not as Unicode
			writeStream = Wsh.Fso.CreateTextFile(asmInfoFullPath, true, false);
			writeStream.Write(asmInfoContent);
			writeStream.Close();
		}
	},
	_setUpVersionToAssemblyInfoContent: function (asmInfoContent, attrName) {
		var index = 0,
			attrBegin = 0,
			attrEnd = 0,
			version = '';
		while (true) {
			attrBegin = asmInfoContent.indexOf(attrName + '(', index);
			if (attrBegin == -1) break;
			attrBegin += attrName.length + 1;
			attrEnd = asmInfoContent.indexOf(')', attrBegin);
			if (attrEnd == -1) break;
			version = asmInfoContent.substring(attrBegin, attrEnd)
				.trim('"\' \t\n\r');
			if (!/^([0-9\.]*)$/gi.test(version)) {
				index = attrEnd;
				continue;
			}
			asmInfoContent = asmInfoContent.substr(0, attrBegin)
				+ '"' + this.versions.join('.') + '"'
				+ asmInfoContent.substr(attrEnd);
			break;
		}
		return asmInfoContent;
	},
	setUpVersionToNuspecCfgs: function () {
		var readStream = null,
			writeStream = null,
			nugetCfgFullPath = '',
			nugetCfgContent = '';
		for (var i = 0, l = this.modulesInfo.length; i < l; i += 1) {
			nugetCfgFullPath = this.modulesInfo[i].nugetCfg;
			if (!nugetCfgFullPath) continue;
			// open for reading, if file doesn't exists, do not create new
			readStream = Wsh.Fso.OpenTextFile(nugetCfgFullPath, 1, false);
			nugetCfgContent = readStream.ReadAll();
			readStream.Close();
			nugetCfgContent = this._setUpVersionToNugspecCfgContent(nugetCfgContent);
			// for overwriting, not as Unicode
			writeStream = Wsh.Fso.CreateTextFile(nugetCfgFullPath, true, false);
			writeStream.Write(nugetCfgContent);
			writeStream.Close();
		}
	},
	_setUpVersionToNugspecCfgContent: function (nugetCfgContent) {
		var index = 0,
			openingNode = '<version>',
			closingNode = '</version>',
			valueBegin = 0,
			valueEnd = 0,
			versionStr = '';
		while (true) {
			valueBegin = nugetCfgContent.indexOf(openingNode, index);
			if (valueBegin == -1) break;
			valueBegin += openingNode.length;
			valueEnd = nugetCfgContent.indexOf(closingNode, valueBegin);
			if (valueEnd == -1) break;
			versionStr = nugetCfgContent.substring(valueBegin, valueEnd)
				.trim('"\' \t\n\r');
			if (!/^([0-9\.]*)$/gi.test(versionStr)) {
				index = valueEnd;
				continue;
			}
			nugetCfgContent = nugetCfgContent.substr(0, valueBegin)
				+ this.versions.join('.')
				+ nugetCfgContent.substr(valueEnd);
			break;
		}
		return nugetCfgContent;
	},
	setUpVersionToReadmes: function () {
		var readStream = null,
			writeStream = null,
			readmeFullPath = '',
			readmeContent = '';
		for (var i = 0, l = this.modulesInfo.length; i < l; i += 1) {
			readmeFullPath = this.modulesInfo[i].readme;
			if (!readmeFullPath) continue;
			// open for reading, if file doesn't exists, do not create new
			readStream = Wsh.Fso.OpenTextFile(readmeFullPath, 1, false);
			readmeContent = readStream.ReadAll();
			readStream.Close();
			readmeContent = this._setUpVersionToReadmeContent(readmeContent);
			// for overwriting, not as Unicode
			writeStream = Wsh.Fso.CreateTextFile(readmeFullPath, true, false);
			writeStream.Write(readmeContent);
			writeStream.Close();
		}
	},
	_setUpVersionToReadmeContent: function (nugetCfgContent) {
		nugetCfgContent = nugetCfgContent.replace(/\/Stable\-v([\d]*)\.([\d]*)\.([\d]*)\-brightgreen\.svg/g, function () {
			var args = [].slice.apply(arguments);
			args[0] = '/Stable-v' + this.versions[0] + '.' + this.versions[1] + '.' + this.versions[2] + '-brightgreen.svg';
			return args[0];
		}.bind(this));
		//log(nugetCfgContent);
		return nugetCfgContent;
	},
	cleanDirectory: function (relativeOrAbsolutePath, allFiles) {
		var folder = Wsh.Fso.GetFolder(relativeOrAbsolutePath),
			filesEnum = new Enumerator(folder.files),
			allFiles = !!allFiles,
			fileExt = '';
		for (; !filesEnum.atEnd() ; filesEnum.moveNext()) {
			file = Wsh.Fso.GetFile(String(filesEnum.item()));
			fileExt = String(Wsh.Fso.GetExtensionName(file.Path)).toLowerCase();
			if (allFiles || (!allFiles && fileExt == 'nupkg')) {
				try {
					Wsh.Fso.DeleteFile(file.Path);
				} catch (e) { }
			}
		}
	},
	incrementGlobalVersionNumberRevision: function () {
		this.versions[3] += 1;
	},
	storeGlobalVersionNumber: function () {
		var fullPath = this.self.BUILD_SCRIPTS_DIR + '/' + this.self.GLOBAL_VERSION_NUMBER_FILENAME;
		var textStream = Wsh.Fso.CreateTextFile(fullPath, true, false); // for overwriting, not as Unicode
		textStream.Write(this.versions.join('.'));
		textStream.Close();
	}
});
