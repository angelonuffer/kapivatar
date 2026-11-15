import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


MODELO = "Polygl0t/Tucano2-qwen-0.5B-Instruct"
RAIZ_PROJETO = Path(__file__).resolve().parents[1]
DESTINO = RAIZ_PROJETO / "public/modelos/tucano2-qwen-0.5b-instruct"


def main():
    with tempfile.TemporaryDirectory(prefix="kapivatar-tucano-") as temporario:
        exportacao = Path(temporario) / "exportacao"
        subprocess.run(
            [
                "optimum-cli",
                "export",
                "onnx",
                "--model",
                MODELO,
                "--task",
                "text-generation",
                "--trust-remote-code",
                str(exportacao),
            ],
            check=True,
        )

        modelos = list(exportacao.rglob("model.onnx"))
        if len(modelos) != 1:
            raise RuntimeError(
                f"Esperava encontrar um model.onnx na exportação, mas encontrei {len(modelos)}."
            )

        try:
            from onnxruntime.quantization import QuantType, quantize_dynamic
        except ImportError as erro:
            raise RuntimeError(
                'Instale as dependências com: pip install "optimum[onnxruntime]" transformers'
            ) from erro

        destino_onnx = DESTINO / "onnx"
        destino_onnx.mkdir(parents=True, exist_ok=True)
        quantize_dynamic(
            str(modelos[0]),
            str(destino_onnx / "model_quantized.onnx"),
            weight_type=QuantType.QInt8,
        )

        for arquivo in exportacao.rglob("*"):
            if not arquivo.is_file() or arquivo.suffix == ".onnx":
                continue
            destino = DESTINO / arquivo.relative_to(exportacao)
            destino.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(arquivo, destino)

    if not (DESTINO / "config.json").exists():
        raise RuntimeError("A exportação não gerou o config.json esperado pelo transformers.js.")

    print(f"Modelo exportado para {DESTINO}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, subprocess.CalledProcessError, RuntimeError) as erro:
        print(f"Erro ao exportar o modelo {MODELO}: {erro}", file=sys.stderr)
        sys.exit(1)
