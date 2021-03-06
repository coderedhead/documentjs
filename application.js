steal.then(function() {
	
	DocumentJS.extend(DocumentJS,
	/* @Static */
	{
		renderTo: function( file, ejs, data ) {
			new DocumentJS.File(file).save(new DocumentJS.EJS({
				text: readFile(ejs)
			}).render(data));
		},
		/**
		 * Will replace with a link to a class or function if appropriate.
		 * @param {Object} content
		 */
		objects: {}
	});

	/**
	 * @constructor
	 * @hide
	 * Creates documentation for an application
	 * @init
	 * Generates documentation from the passed in files.
	 * @param {Array} total An array of path names or objects with a path and text.
	 * @param {Object} appName The application name.
	 */
	DocumentJS.Application = function( total, appName ) {

		this.name = appName;
		this.total = total;
		//this.files = [];
		this.objects = {}; //all the objects live here, have a unique name
		DocumentJS.Application.objects = this.objects;
		//create each Script, which will create each class/constructor, etc
		for ( var s = 0; s < total.length; s++ ) {
			DocumentJS.Script.process(total[s], this.objects)
		}
		//sort class and constructors so they are easy to find
		//this.all_sorted = DocumentJS.Class.listing.concat( DocumentJS.Constructor.listing ).sort( DocumentJS.Pair.sort_by_name )
	}


	DocumentJS.Application.prototype =
	/* @prototype */
	{
		/**
		 * Creates the documentation files.
		 * @param {String} path where to put the docs
		 */
		generate: function( path, convert ) {
			print("generating ...")


			//go through all the objects
			for ( var name in DocumentJS.Application.objects ) {
				if (DocumentJS.Application.objects.hasOwnProperty(name)){
					var obj = DocumentJS.extend({}, DocumentJS.Application.objects[name]),
						toJSON;

					if ( obj.type == 'script' || typeof obj != "object" ) {
						continue;
					}
					//get all children
					var children = this.linker(obj);
					obj.children = children;

					var converted = name.replace(/ /g, "_").replace(/&#46;/g, ".").replace(/&gt;/g, "_gt_").replace(/\*/g, "_star_")
					toJSON = this.toJSON(obj);
					new DocumentJS.File(path + "/" + converted + ".json").save(toJSON);
				}

			}


			this.searchData(path, convert);
			this.summaryPage(path, convert)
		},
		shallowParent: function( item, parent ) {
			if ( item.parents && parent ) {
				for ( var i = 0; i < item.parents.length; i++ ) {
					if ( item.parents[i] == parent.name ) {
						return true;
					}
				}
			}
			return false;
		},
		linker: function( item, stealSelf, parent ) {
			var result = stealSelf ? [item.name] : [];
			if ( item.children && !this.shallowParent(item, parent) ) {
				for ( var c = 0; c < item.children.length; c++ ) {
					var child = DocumentJS.Application.objects[item.children[c]];
					var adds = this.linker(child, true, item);
					if ( adds ) {
						result = result.concat(adds);
					}

				}
			}
			return result;
		},
		/**
		 * Creates a page for all classes and constructors
		 * @param {String} summary the left hand side.
		 */
		summaryPage: function( path, convert ) {
			//find index page
			var base = path.replace(/[^\/]*$/, "");
			this.indexPage = DocumentJS.Application.objects.index

			//checks if you have a summary
			if ( readFile(base + "summary.ejs") ) {
				DocumentJS.renderTo(base + "docs.html", base + "summary.ejs", {
					pathToRoot: new DocumentJS.File(base.replace(/\/[^\/]*$/, "")).pathToRoot(),
					path: path
				})
			} else {
				print("Using default page layout.  Overwrite by creating: " + base + "summary.ejs");
				DocumentJS.renderTo(base + "docs.html", "documentjs/jmvcdoc/summary.ejs", {
					pathToRoot: new DocumentJS.File(base.replace(/\/[^\/]*$/, "")).pathToRoot(),
					path: path
				}); //default 
			}


		},
		indexOf: function( array, item ) {
			var i = 0,
				length = array.length;
			for (; i < length; i++ ){
				if ( array[i] === item ){
					return i;
				}
			}
			return -1;
		},
		addTagToSearchData: function( data, tag, searchData ) {

			var letter, l, depth = 2,
				current = searchData;

			for ( l = 0; l < depth; l++ ) {
				letter = tag.substring(l, l + 1);
				if (!current[letter] ) {
					current[letter] = {};
					current[letter].list = [];
				}
				if ( this.indexOf(current[letter].list, data) == -1 ) {
					current[letter].list.push(data);
				}
				current = current[letter];
			}
		},
		addToSearchData: function( list, searchData ) {
			var c, parts, part, p, fullName;
			for ( var name in list ) {
				if (list.hasOwnProperty(name)){
					c = list[name];
					if ( c.type == 'script' ) {
						continue;
					}
					//break up into parts
					fullName = c.name;
					searchData.list[fullName] = {
						name: c.name,
						type: c.type
					};
					if ( c.title ) {
						searchData.list[fullName].title = c.title
					}
					if ( c.tags ) {
						searchData.list[fullName].tags = c.tags
					}
					if ( c.hide ) {
						searchData.list[fullName].hide = c.hide
					}
					parts = fullName.split(".");
					for ( p = 0; p < parts.length; p++ ) {
						part = parts[p].toLowerCase();
						if ( part == "jquery" ){
							continue;
						}
						this.addTagToSearchData(fullName, part, searchData)
					}
					//now add tags if there are tags
					if ( c.tags ) {
						for ( var t = 0; t < c.tags.length; t++ ){
							this.addTagToSearchData(fullName, c.tags[t], searchData);
						}
					}
				}
			}
		},
		searchData: function( path, convert ) {
			//var sortedClasses = DocumentJS.Class.listing.sort( DocumentJS.Pair.sort_by_name )
			//go through and create 2 level hash structure
			var searchData = {
				list: {}
			};


			this.addToSearchData(DocumentJS.Application.objects, searchData)


			return new DocumentJS.File(path + "/searchData.json").save(this.toJSON(searchData, false));
		},
		toJSON: function() {
			return "C(" + DocumentJS.toJSON.apply(DocumentJS.toJSON, arguments) + ")"
		}
	}
})