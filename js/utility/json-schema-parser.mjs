/** @typedef {string} JsonSchemaTypeName */
export class ParseJSONSchema {
	/**
	 * param {typeof EXAMPLE_JSON_SCHEMA} json_schema
	 */
	constructor(json_schema) {
		this.types = new Map(Object.entries(json_schema.definitions));
	}

	/**
	 *
	 * @param {JsonSchemaTypeName} type_name
	 */
	resolve_type_name(type_name) {
		const type = this.types.get(type_name);
		if (type === undefined) throw new Error(`Type ${type_name} not found`);
		return type;
	}

	/**
	 *
	 * @param {string} ref
	 */
	#_resolve_ref(ref) {
		const prefix = "#/definitions/";
		if (!ref.startsWith(prefix)) throw new Error(`Ref ${ref} is not a local reference definition`);
		return this.resolve_type_name(ref.slice(prefix.length));
	}

	/** @typedef {{ key: string, opt: boolean, next?: XAJSPath }} XAJSObjectPath */
	/** @typedef {{ iterate: boolean, next?: XAJSPath }} XAJSArrayPath */
	/** @typedef {{ self_might_be_wanted: boolean, variants: XAJSPath[] }} XAJSVariantsPath  */
	/** @typedef {XAJSObjectPath | XAJSArrayPath | XAJSVariantsPath} XAJSPath */

	/**
	 *
	 * @returns {(XAJSPath|undefined)[]}
	 */
	find_paths_to_wanted_on_type(type, wanted_type) {
		// resolve ref if needed
		if (type["$ref"] !== undefined) type = this.#_resolve_ref(type["$ref"]);

		// check if type is wanted or needs to be iterated
		if (type === wanted_type) return [undefined];
		else if (type.type === "object") {
			/** @type {XAJSObjectPath[]} */
			const paths = [];
			for (const [key, value] of Object.entries(type.properties || {})) {
				const path_key = { key, opt: !type.required.includes(key) };
				const sub_paths = this.find_paths_to_wanted_on_type(value, wanted_type);
				for (const sub_path of sub_paths) {
					paths.push({ ...path_key, next: sub_path });
				}
			}
			return paths;
		} else if (type.type === "array") {
			const paths = [];
			const sub_paths = this.find_paths_to_wanted_on_type(type.items, wanted_type);
			for (const sub_path of sub_paths) {
				paths.push({ iterate: true, next: sub_path });
			}
			return paths;
		} else if (type.type === "string") {
			return [];
		} else if (type.type === "number") {
			return [];
		} else if (type.type === "boolean") {
			return [];
		} else if (type.type === "null") {
			return [];
		} else if (type.oneOf !== undefined || type.anyOf !== undefined || type.allOf !== undefined) {
			/** @type {XAJSVariantsPath} */
			const variants_path = { self_might_be_wanted: false, variants: [] };
			const variant_list = type.oneOf || type.anyOf || type.allOf;
			for (const variant_type of variant_list) {
				const sub_paths = this.find_paths_to_wanted_on_type(variant_type, wanted_type);
				for (const sub_path of sub_paths) {
					if (sub_path === undefined) variants_path.self_might_be_wanted = true;
					else variants_path.variants.push(sub_path);
				}
			}
			if (variants_path.variants.length === 0 && !variants_path.self_might_be_wanted) return [];
			else return [variants_path];
		}

		throw new Error(`Type ${type} is unknown`);
	}



	/**
	 *
	 * @param {any} object_of_type
	 * @param {(XAJSPath|undefined)[]} wanted_paths_for_type
	 * @param {(obj: any) => boolean} verify_wanted
	 * @return {Set<any>}
	 */
	get_wanted_from_paths(object_of_type, wanted_paths_for_type, verify_wanted) {
		return new Set(wanted_paths_for_type.flatMap(path => this.#_get_wanted_from_path(object_of_type, path, verify_wanted)));
	}

	/**
	 * @param {any} object_of_type
	 * @param {XAJSPath|undefined} path_for_type
	 * @param {(obj: any) => boolean} verify_wanted
	 * @return {any[]}
	 */
	#_get_wanted_from_path(object_of_type, path_for_type, verify_wanted) {
		if (path_for_type == undefined) {
			return [object_of_type];
		} else if ("key" in path_for_type) {
			if (path_for_type.opt && object_of_type[path_for_type.key] === undefined) return [];
			if (path_for_type.next === undefined) return object_of_type[path_for_type.key];
			return this.#_get_wanted_from_path(object_of_type[path_for_type.key], path_for_type.next, verify_wanted);
		} else if ("iterate" in path_for_type) {
			return object_of_type.flatMap(el => this.#_get_wanted_from_path(el, path_for_type.next, verify_wanted));
		} else if ("variants" in path_for_type) {
			const objs = [];
			if (path_for_type.self_might_be_wanted) objs.push(object_of_type);
			const sub_objs = path_for_type.variants.flatMap(variant_path => this.#_get_wanted_from_path(object_of_type, variant_path, verify_wanted));
			return [...objs, ...sub_objs].filter(obj => verify_wanted(obj));
		} else throw new Error(`Unknown path type ${path_for_type}`);
	}

}