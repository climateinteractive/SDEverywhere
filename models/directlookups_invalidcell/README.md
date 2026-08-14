Vensim appears to have an off-by-one bug where it outputs zero for the column following a blank/non-numeric cell, but then resumes outputting correct values after that (note the unusual Vensim output in `directlookups_invalidcell.dat`).

Until the Vensim issue is resolved, this test model will be skipped by the `tests/modeltests` script (in the default mode, which tests all models), but the model can be tested directly can be running `tests/modeltests directlookups_invalidcell`.
