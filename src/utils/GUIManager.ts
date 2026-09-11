import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

export class GUIManager {

	gui: GUI
	guiIndexMap: Record<string, number> = {};
	numFolders = 0;

	constructor(gui: GUI) {

		this.gui = gui;

	}

	/**
	 * Creates a named folder and returns it so callers can chain `.add()`
	 * directly instead of following up with a `getFolder()` lookup.
	 */
	addFolder(folderName: string) {

		const {gui, guiIndexMap} = this;

		const existingFolder = this.getFolder(folderName);
		if (existingFolder) {
			return existingFolder;
		}

		const folder = gui.addFolder(folderName);
		guiIndexMap[folderName] = this.numFolders;
		this.numFolders++;

		return folder;

	}

	getFolder(folderName: string) {

		const folderIndex = this.guiIndexMap[folderName]

		if (folderIndex === undefined) {
			return null;
		}

		return this.gui.folders[folderIndex];

	}

	/** Collapses every folder, used to start the debug panel tidy. */
	closeAll() {

		for (const folder of this.gui.folders) {

			folder.close();

		}

	}

}
