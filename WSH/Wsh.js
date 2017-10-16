var Wsh = {
	Fso: new ActiveXObject('Scripting.FileSystemObject'),
	Write: function (msg) {
		WScript.StdOut.Write(msg);
	},
	WriteLine: function (msg) {
		WScript.StdOut.WriteLine(msg);
	},
	TypeOf: function (o) {
		var r = Object.prototype.toString.apply(o); // "[object Something]"
		return r.substr(8, r.length - 9); // Something
	},
	Clone: function (o) {
		return JSON.parse(JSON.stringify(o));
	},
	Extend: function (obj, defaultValues) {
		obj = obj || {};
		defaultValues = defaultValues || {};
		var r = {}, key = '';
		for (key in obj) {
			r[key] = obj[key];
		}
		for (key in defaultValues) {
			if (typeof(obj[key]) == 'undefined') r[key] = defaultValues[key];
		}
		return r;
	},
	Isset: (function (strStr, undefStr) {
		var test = function (val) {
			return typeof (val) != undefStr && val !== null;
		};
		return function (object, dotSeparatedIndexes) {
			var iterator = 0, 
				nextIterator = 0, 
				arr = [object]
				indexes = typeof dotSeparatedIndexes == strStr ? dotSeparatedIndexes.split('.') : [];
			if (test(object)) {
				if (typeof (dotSeparatedIndexes) != strStr) return test(object[dotSeparatedIndexes]);
				for (var i = 0, l = indexes.length; i < l; i += 1) {
					nextIterator = iterator + 1;
					arr[nextIterator] = arr[iterator][indexes[i]];
					if (!test(arr[nextIterator])) return !1;
					iterator += 1
				}
			} else {
				return !1;
			};
			return !0;
		};
	})('string', 'undefined'),
	InputDialog: function (text, title, defaultOption, allowedOptions) {
		text = text || '';
		title = title || '';
		defaultOption = defaultOption || null;
		allowedOptions = allowedOptions || [];
		var i = 0, l = 0,
			result = 0,
			responseInt = 0,
			allowedOption = false,
			// Open the input dialog box using a function in the InputBox.vb file.
			responseStr = WSHInputBox(text, title, defaultOption);
		// if not cancel
		if (responseStr !== null && responseStr !== undefined) {
			responseStr = responseStr.replace(/[^0-9]/g, '');
			responseInt = parseInt(responseStr, 10);
			allowedOption = false;
			for (i = 0, l = allowedOptions.length; i < l; i += 1) {
				if (responseInt === allowedOptions[i]) {
					allowedOption = true;
					break;
				}
			}
			if (allowedOption) {
				result = responseInt;
			} else {
				return arguments.callee.apply(this, [].slice.apply(arguments));
			}
		}
		return result;
	},
	Echo: function (str) {
		WScript.Echo(str);
	}
}