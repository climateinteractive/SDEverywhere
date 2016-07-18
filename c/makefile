# Do "export P={c-file-basename}" before running this makefile.
OBJECTS=main.o vensim.o model.o macros.o fcmp.o
CFLAGS= -Wall -O3 `pkg-config --cflags glib-2.0`
LDLIBS= `pkg-config --libs glib-2.0`
CC=clang

$(P): $(OBJECTS)
