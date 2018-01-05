# Do "export P={c-file-basename}" before running this makefile.
OBJECTS=main.o vensim.o model.o macros.o fcmp.o
CFLAGS=-Wall -O3
LDLIBS=

# In case of a Linux build we need to add
# an extra flag, to link with math library
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Linux)
    LDLIBS+= -lm
endif

CC=clang

$(P): $(OBJECTS) $P.o
