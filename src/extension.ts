import axios from 'axios';
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';	

const COMMAND = 'code-actions-explain.command';

dotenv.config();

export function asdf() {
			
	try {
			const editor = vscode.window.activeTextEditor;

			if(!editor) {
				return;
			}

			const selection = editor.selection;

			var text = editor.document.getText(selection);
			console.log(text);

			const headers = {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + process.env.API_TOKEN
			}
			const data = {
				"prompt": "A not so smart developer asked me what this passage from the Wikibase manual means:\n\"\"\"\n" +
				 text + "\n\"\"\"\nI rephrased it for him, in plain language that anyone should understand:\n\"\"\"\n",
				"temperature": 0.5,
				"max_tokens": text.length < 400 ? text.length : 400,
				"top_p": 1.0,
				"frequency_penalty": 0.2,
				"stop": ["\"\"\""]
			};
			console.log(data);
			axios.post(
				'https://api.openai.com/v1/engines/davinci/completions',
				data,
				{ headers: headers }
				).then( (resp) => {

			if (resp.data.choices && resp.data.choices.length > 0) {
				const document = editor.document;

				vscode.window.showInformationMessage("Request completed!");

				const choice = resp.data.choices[0]
				console.log(resp.data)
				editor.edit(editBuilder => {
					editBuilder.replace(selection, choice.text);
				});
			}
		});
	} catch (exception) {
		process.stderr.write(`ERROR received: ${exception}\n`);
	}

}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('markdown', new OpenAiCodeCompletion(), {
			providedCodeActionKinds: OpenAiCodeCompletion.providedCodeActionKinds
		}));


	context.subscriptions.push(
		vscode.commands.registerCommand(COMMAND, () => asdf())
	);
}

export class OpenAiCodeCompletion implements vscode.CodeActionProvider {

	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
		if (!this.isNotEmptyText(document, range)) {
			return;
		}

		const makeRequestAndReplace = this.createFix(document, range);
		makeRequestAndReplace.isPreferred = true;

		return [
			makeRequestAndReplace,
		];
	}

	private isNotEmptyText(document: vscode.TextDocument, range: vscode.Range) {
		const start = range.start;
		const line = document.lineAt(start.line);
		return line.text[start.character] !== ' ';
	}

	private createFix(document: vscode.TextDocument, range: vscode.Range ): vscode.CodeAction {
		const fix = new vscode.CodeAction(`Explain it like im stupid`, vscode.CodeActionKind.QuickFix);
		fix.command = { command: COMMAND, title: 'Explain it like im stupid', tooltip: 'This will replace the selected text' };;
		return fix;
	}
}