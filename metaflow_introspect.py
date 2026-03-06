import json
import sys
import inspect
import re

STEP_DECO_BASE = "https://docs.metaflow.org/api/step-decorators"
FLOW_DECO_BASE = "https://docs.metaflow.org/api/flow-decorators"

def build_doc_url(name, kind):
    base = STEP_DECO_BASE if kind == "step" else FLOW_DECO_BASE
    return f"{base}/{name}"

def parse_param_docs(docstring):
    if not docstring:
        return {}
    result = {}
    for name, desc in re.findall(r"^\s{4,}(\w+)\s*(?:\([^)]*\))?\s*:\s*(.+)", docstring, re.MULTILINE):
        result[name] = desc.strip()
    for name, desc in re.findall(r":param\s+(?:\w+\s+)?(\w+)\s*:\s*(.+)", docstring):
        result[name] = desc.strip()
    return result

def extract_summary(docstring):
    if not docstring:
        return ""
    for line in docstring.splitlines():
        if line.strip():
            return line.strip()
    return ""

def type_label(value):
    if value is None:
        return "any"
    return {
        bool: "bool",
        int: "int",
        float: "float",
        str: "str",
        list: "list",
        dict: "dict",
        tuple: "tuple"
    }.get(type(value), type(value).__name__)

def introspect():
    try:
        import metaflow.decorators as mfd
    except ImportError:
        print(json.dumps({"__error__": "metaflow not found"}))
        sys.exit(1)

    result = {}
    decoratorSet = set()

    for kind, base in {"step": mfd.StepDecorator, "flow": mfd.FlowDecorator}.items():
        for klass in base.__subclasses__():

            name = getattr(klass, "name", None)

            if not name or name in decoratorSet:
                continue

            if inspect.isabstract(klass) or name.endswith("_internal") or name == "NONAME":
                continue

            decoratorSet.add(name)

            defaults = getattr(klass, "defaults", {}) or {}
            docstring = inspect.getdoc(klass) or ""
            param_docs = parse_param_docs(docstring)

            result[name] = {
                "kind": kind,
                "params": {
                    p: {
                        "default": d,
                        "type": type_label(d),
                        "doc": param_docs.get(p, "")
                    }
                    for p, d in defaults.items()
                },
                "summary": extract_summary(docstring),
                "doc_url": build_doc_url(name, kind),
            }

    result["step"] = {
        "kind": "step",
        "params": {},
        "summary": "Marks a method as a Metaflow step in the flow DAG.",
        "doc_url": build_doc_url("step", "step")
    }

    return result


if __name__ == "__main__":
    print(json.dumps(introspect(), indent=2, default=str))