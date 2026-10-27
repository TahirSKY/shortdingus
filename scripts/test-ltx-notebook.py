"""Structural checks only: these do not establish GPU execution or output quality."""
import ast
import json
from pathlib import Path
import unittest


class NotebookTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.book = json.loads((Path(__file__).resolve().parents[1] / 'public/colab/ltx-video-test.ipynb').read_text())
        cls.code = '\n'.join(''.join(c['source']) for c in cls.book['cells'] if c['cell_type'] == 'code')

    def test_all_cells_and_nested_runner_scripts_parse(self):
        for cell in self.book['cells']:
            if cell['cell_type'] != 'code':
                continue
            source = ''.join(cell['source'])
            tree = ast.parse(source)
            for node in ast.walk(tree):
                if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id in ('setup', 'runner') for t in node.targets):
                    ast.parse(ast.literal_eval(node.value))

    def test_exact_model_and_source_are_pinned(self):
        self.assertIn('4b2d053057623ddd4d0a1d3e9cd28890e9ef487f', self.code)
        self.assertIn('8984fa25007f376c1a299016d0957a37a2f797bb', self.code)
        self.assertIn('ltxv-2b-0.9.8-distilled.safetensors', self.code)

    def test_small_memory_budget_is_enforced(self):
        tree = ast.parse(self.code)
        budget = next(n for n in ast.walk(tree) if isinstance(n, ast.If) and ast.unparse(n.test) == 'FRAMES < 9 or FRAMES > 97 or (FRAMES - 1) % 8')
        for frames, rejected in [(33, False), (73, False), (97, False), (32, True), (105, True), (1, True)]:
            self.assertEqual(bool(eval(compile(ast.Expression(budget.test), '<frame-budget>', 'eval'), {}, {'FRAMES': frames})), rejected)

    def test_no_output_or_execution_results_are_embedded(self):
        for cell in self.book['cells']:
            if cell['cell_type'] == 'code':
                self.assertEqual(cell['outputs'], [])
                self.assertIsNone(cell['execution_count'])


class ServerNotebookTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.book = json.loads((Path(__file__).resolve().parents[1] / 'public/colab/ltx-video-server.ipynb').read_text())
        cls.code = '\n'.join(''.join(c['source']) for c in cls.book['cells'] if c['cell_type'] == 'code')

    def test_all_cells_and_nested_server_script_parse(self):
        for cell in self.book['cells']:
            if cell['cell_type'] != 'code':
                continue
            tree = ast.parse(''.join(cell['source']))
            for node in ast.walk(tree):
                if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id in ('setup', 'runner', 'server') for t in node.targets):
                    ast.parse(ast.literal_eval(node.value))

    def test_shares_pinned_setup_with_test_notebook(self):
        for marker in ('4b2d053057623ddd4d0a1d3e9cd28890e9ef487f', '8984fa25007f376c1a299016d0957a37a2f797bb', 'ltxv-2b-0.9.8-distilled.safetensors'):
            self.assertIn(marker, self.code)

    def test_server_requires_token_and_enforces_memory_budget(self):
        self.assertIn("os.environ['LTX_SERVER_TOKEN']", self.code)
        self.assertIn('secrets.token_urlsafe', self.code)
        self.assertIn('s.width * s.height > 576 * 320', self.code)
        self.assertIn('s.frames < 9 or s.frames > 97 or (s.frames - 1) % 8', self.code)

    def test_no_output_or_execution_results_are_embedded(self):
        for cell in self.book['cells']:
            if cell['cell_type'] == 'code':
                self.assertEqual(cell['outputs'], [])
                self.assertIsNone(cell['execution_count'])


if __name__ == '__main__':
    unittest.main()