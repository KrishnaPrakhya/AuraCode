"""
Code Execution Service
Handles safe code execution in isolated environments
"""

import subprocess
import json
import sys
import tempfile
import os
from typing import List, Tuple
from models import TestCase, TestResult, CodeExecutionResponse

class CodeExecutor:
    """Executes code safely with test cases"""
    
    # Language configurations
    LANGUAGE_CONFIGS = {
        "python": {
            "executable": "python3",
            "extension": ".py",
            "wrapper": """
import json
import sys
import traceback

try:
    {code}
    result = test_solution({input_code})
    print(json.dumps({{"output": str(result), "error": None}}))
except Exception as e:
    print(json.dumps({{"output": "", "error": str(e) + "\\n" + traceback.format_exc()}}))
"""
        },
        "javascript": {
            "executable": "node",
            "extension": ".js",
            "wrapper": """
async function runCode() {{
    try {{
        {code}
        const result = await testSolution({input_code});
        console.log(JSON.stringify({{"output": String(result), "error": null}}));
    }} catch (e) {{
        console.log(JSON.stringify({{"output": "", "error": e.toString()}}));
    }}
}}
runCode();
"""
        },
        "typescript": {
            "executable": "ts-node",
            "extension": ".ts",
            "wrapper": """
async function runCode(): Promise<void> {{
    try {{
        {code}
        const result = await testSolution({input_code});
        console.log(JSON.stringify({{"output": String(result), "error": null}}));
    }} catch (e: any) {{
        console.log(JSON.stringify({{"output": "", "error": e.toString()}}));
    }}
}}
runCode();
"""
        }
    }

    @staticmethod
    async def execute(
        code: str,
        language: str,
        test_cases: List[TestCase],
        time_limit_ms: int = 5000
    ) -> CodeExecutionResponse:
        """
        Execute code against test cases
        """
        
        if language not in CodeExecutor.LANGUAGE_CONFIGS:
            return CodeExecutionResponse(
                success=False,
                test_results=[],
                execution_time_ms=0,
                error=f"Unsupported language: {language}"
            )

        config = CodeExecutor.LANGUAGE_CONFIGS[language]
        test_results = []
        total_execution_time = 0

        for idx, test_case in enumerate(test_cases):
            try:
                # Create wrapped code
                wrapped_code = CodeExecutor._wrap_code(
                    code,
                    test_case.input,
                    language
                )

                # Execute in subprocess
                result, execution_time = await CodeExecutor._run_subprocess(
                    wrapped_code,
                    config,
                    time_limit_ms
                )

                total_execution_time += execution_time

                # Parse result
                try:
                    output = json.loads(result)
                    actual_output = output.get("output", "")
                    error = output.get("error")
                except json.JSONDecodeError:
                    actual_output = result
                    error = "Failed to parse output"

                # Compare with expected
                passed = (
                    actual_output.strip() == test_case.expected_output.strip()
                    and error is None
                )

                test_results.append(TestResult(
                    test_case_index=idx,
                    passed=passed,
                    expected_output=test_case.expected_output,
                    actual_output=actual_output,
                    error_message=error,
                    execution_time_ms=int(execution_time * 1000)
                ))

            except Exception as e:
                test_results.append(TestResult(
                    test_case_index=idx,
                    passed=False,
                    expected_output=test_case.expected_output,
                    actual_output="",
                    error_message=str(e),
                    execution_time_ms=0
                ))

        success = all(tr.passed for tr in test_results)
        return CodeExecutionResponse(
            success=success,
            test_results=test_results,
            execution_time_ms=int(total_execution_time * 1000)
        )

    @staticmethod
    def _wrap_code(code: str, test_input: str, language: str) -> str:
        """Wrap user code with test harness"""
        
        config = CodeExecutor.LANGUAGE_CONFIGS[language]
        wrapper = config["wrapper"]
        
        # Format input based on language
        if language in ["python"]:
            formatted_input = repr(test_input)
        else:
            formatted_input = json.dumps(test_input)
        
        return wrapper.format(
            code=code,
            input_code=formatted_input
        )

    @staticmethod
    async def _run_subprocess(
        code: str,
        config: dict,
        timeout_ms: int
    ) -> Tuple[str, float]:
        """Run code in subprocess with timeout"""
        
        import time
        import asyncio
        
        # Create temp file
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix=config['extension'],
            delete=False
        ) as f:
            f.write(code)
            temp_file = f.name

        try:
            start_time = time.time()
            timeout_seconds = timeout_ms / 1000
            
            # Run subprocess
            process = await asyncio.create_subprocess_exec(
                config['executable'],
                temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout_seconds
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                raise TimeoutError(f"Execution timeout ({timeout_ms}ms)")

            execution_time = time.time() - start_time
            output = stdout.decode('utf-8', errors='replace')
            
            if stderr:
                error_output = stderr.decode('utf-8', errors='replace')
                output = f"{error_output}\n{output}"

            return output, execution_time

        finally:
            # Cleanup
            if os.path.exists(temp_file):
                os.unlink(temp_file)
