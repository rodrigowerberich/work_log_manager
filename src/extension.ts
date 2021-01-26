// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { deprecate } from 'util';
import * as vscode from 'vscode';

function createLineStartRegex(str: string){
	return new RegExp(`(^${str}\\s.+)|\n(${str}\\s.+)`,'g');
}

function searchLineStarts(regex: RegExp, text: string){
	let search_results = new Array<string>();
	let match = regex.exec(text);
	while (match){
		if (match[1]){
			search_results.push(match[1]);
		}else if (match[2]){
			search_results.push(match[2]);
		}
		match = regex.exec(text);
	}
	return search_results;
}

interface Position{
	line: number;
	character: number;
}

class VsCodePosition implements Position{
	line: number;
	character: number;

	constructor(position: vscode.Position){
		this.line = position.line;
		this.character = position.character;
	}
}

interface Editor{
	getText(): string;
	getCurrentPosition(): Position;
	getStartOfCurrentLine(): Position;
	writeToPosition(position: Position, text: string): void;
}

class VsCodeEditor implements vscode.TextEditor, Editor {
	myEditor : vscode.TextEditor;
	document: vscode.TextDocument;
	selection: vscode.Selection;
	selections: vscode.Selection[];
	visibleRanges: vscode.Range[];
	options: vscode.TextEditorOptions;
	viewColumn?: vscode.ViewColumn | undefined;

	constructor(editor: vscode.TextEditor){
		this.myEditor = editor;
		this.document = this.myEditor.document;
		this.selection = this.myEditor.selection;
		this.selections = this.myEditor.selections;
		this.visibleRanges =  this.myEditor.visibleRanges;
		this.options = this.myEditor.options;
		this.viewColumn = this.myEditor.viewColumn;
	}
	getStartOfCurrentLine(): Position {
		let position = this.getCurrentPosition();
		position.character = 0;
		return position;
	}
	getCurrentPosition(): Position {
		return new VsCodePosition(this.myEditor.selection.active);
	}
	writeToPosition(genericPosition: Position, text: string): void {
		const position = new vscode.Position(genericPosition.line, genericPosition.character);
			
		this.myEditor.edit(editBuilder => {
			editBuilder.insert(position, text);
		});
	}
	getText(): string {
		return this.myEditor.document.getText();
	}

	edit(callback: (editBuilder: vscode.TextEditorEdit) => void, options?: { undoStopBefore: boolean; undoStopAfter: boolean; }): Thenable<boolean> {
		return this.myEditor.edit(callback, options);
	}
	insertSnippet(snippet: vscode.SnippetString, location?: vscode.Range | vscode.Position | readonly vscode.Position[] | readonly vscode.Range[], options?: { undoStopBefore: boolean; undoStopAfter: boolean; }): Thenable<boolean> {
		return this.myEditor.insertSnippet(snippet, location, options);
	}
	setDecorations(decorationType: vscode.TextEditorDecorationType, rangesOrOptions: vscode.Range[] | vscode.DecorationOptions[]): void {
		this.myEditor.setDecorations(decorationType, rangesOrOptions);
	}
	revealRange(range: vscode.Range, revealType?: vscode.TextEditorRevealType): void {
		this.myEditor.revealRange(range, revealType);
	}
	show(column?: vscode.ViewColumn): void {
		this.myEditor.show(column);
	}
	hide(): void {
		this.myEditor.hide();
	}
}


function clearTextOfException(originalText: string): string {
	const findIgnoreText = new RegExp('(```(?:.*\\r{0,1}\\n)*?```\\r{0,1}\\n)','g');
	const parsedText = originalText.replace(findIgnoreText, "");
	return parsedText;
}

function getCurrentEntryNumber(text: string) : number{
	const parsedText = clearTextOfException(text);
	const double_pound_re = createLineStartRegex('##');
	const linesStartingWithDoublePound = searchLineStarts(double_pound_re, parsedText);
	return linesStartingWithDoublePound.length + 1;
}

function buildEntry(date: Date, number: number) : string{
	return '## Entry '+number.toString()+' [' + date.toTimeString().substr(0, 8)+']\n';
}

function buildDay(date: Date) : string{
	return '# Day ' + date.getDate()+'-'+(date.getMonth()+1)+'-'+date.getFullYear()+'\n';
}

function insertEntry(editor: Editor){
	const text = editor.getText();
	let currentEntryNumber = getCurrentEntryNumber(text);
	const date = new Date();
	let buildEntryTxt = buildEntry(date, currentEntryNumber);
	let position = editor.getStartOfCurrentLine();
	editor.writeToPosition(position, buildEntryTxt);
}

function insertDay(editor: Editor){
	const date = new Date();
	let buildDayTxt = buildDay(date);
	let position = editor.getStartOfCurrentLine();
	editor.writeToPosition(position, buildDayTxt);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let insertEntryCommandRegister = vscode.commands.registerCommand('work-log-manager.insertEntry', () => {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			let wrapperEditor = new VsCodeEditor(editor);
			insertEntry(wrapperEditor);
		}
	});

	let insertDayCommandRegister = vscode.commands.registerCommand('work-log-manager.insertDay', () => {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			let wrapperEditor = new VsCodeEditor(editor);
			insertDay(wrapperEditor)
		}
	});

	// let parseLogFileCommandRegister = vscode.commands.registerCommand('work-log-manager.parseLogFile', () => {
	// 	const editor = vscode.window.activeTextEditor;

	// 	if (editor) {
	// 		const text = editor.document.getText();
			
	// 		const find_ignore_text = new RegExp('(```(?:.*\\r{0,1}\\n)*?```\\r{0,1}\\n)','g');
	// 		const parsed_text = text.replace(find_ignore_text, "");
			
	// 		const single_pound_re = createLineStartRegex('#');
	// 		const lines_starting_with_single_pound = searchLineStarts(single_pound_re, parsed_text);

	// 		const double_pound_re = createLineStartRegex('##');
	// 		const lines_starting_with_double_pound = searchLineStarts(double_pound_re, parsed_text);

	// 		console.log(lines_starting_with_single_pound);
	// 		console.log(lines_starting_with_double_pound);

	// 	}
	// });

	context.subscriptions.push(insertEntryCommandRegister);
	context.subscriptions.push(insertDayCommandRegister);
	// context.subscriptions.push(parseLogFileCommandRegister);
}

// this method is called when your extension is deactivated
export function deactivate() {}
