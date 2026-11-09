# Componentes de terceiros

| Componente | Onde | Licença | Origem |
|---|---|---|---|
| transformers.js 3.7.5 (`transformers.min.js`) | `sites/whatsapp/lib/` | Apache-2.0 (texto em `sites/whatsapp/lib/LICENSE`) | https://github.com/huggingface/transformers.js |
| onnxruntime-web (`ort-wasm-simd-threaded.jsep.*`), distribuído junto com o transformers.js | `sites/whatsapp/lib/` | MIT | https://github.com/microsoft/onnxruntime |
| Roboto Mono | `fonts/` | SIL Open Font License 1.1 (texto em `fonts/OFL-RobotoMono.txt`) | https://github.com/googlefonts/robotomono |
| Open Sans | `fonts/` | SIL Open Font License 1.1 (texto em `fonts/OFL-OpenSans.txt`) | https://github.com/googlefonts/opensans |
| Modelos Whisper em ONNX (`Xenova/whisper-small`, `-base`, `-tiny`) | baixados em tempo de uso, não fazem parte do pacote | MIT | https://huggingface.co/Xenova · https://github.com/openai/whisper |

Os arquivos de `sites/whatsapp/lib/` são os do pacote npm `@huggingface/transformers@3.7.5` (pasta `dist/`), sem alteração.
