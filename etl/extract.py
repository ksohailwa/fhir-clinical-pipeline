from pathlib import Path

import pandas as pd

Row = dict[str, str]


def read_rows(path: Path) -> list[Row]:
    frame = pd.read_csv(path, dtype=str, keep_default_na=False)
    return frame.to_dict(orient="records")
