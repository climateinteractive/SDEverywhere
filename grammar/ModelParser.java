// Generated from Model.g4 by ANTLR 4.5
import org.antlr.v4.runtime.atn.*;
import org.antlr.v4.runtime.dfa.DFA;
import org.antlr.v4.runtime.*;
import org.antlr.v4.runtime.misc.*;
import org.antlr.v4.runtime.tree.*;
import java.util.List;
import java.util.Iterator;
import java.util.ArrayList;

@SuppressWarnings({"all", "warnings", "unchecked", "unused", "cast"})
public class ModelParser extends Parser {
	static { RuntimeMetaData.checkVersion("4.5", RuntimeMetaData.VERSION); }

	protected static final DFA[] _decisionToDFA;
	protected static final PredictionContextCache _sharedContextCache =
		new PredictionContextCache();
	public static final int
		T__0=1, T__1=2, T__2=3, T__3=4, T__4=5, T__5=6, T__6=7, T__7=8, T__8=9, 
		Encoding=10, UnitsDoc=11, Group=12, Star=13, Div=14, Plus=15, Minus=16, 
		Less=17, LessEqual=18, Greater=19, GreaterEqual=20, Equal=21, TwoEqual=22, 
		NotEqual=23, Exclamation=24, Id=25, Const=26, StringLiteral=27, Keyword=28, 
		Whitespace=29;
	public static final int
		RULE_model = 0, RULE_equation = 1, RULE_lhs = 2, RULE_subscriptList = 3, 
		RULE_constList = 4, RULE_expr = 5, RULE_exprList = 6, RULE_lookup = 7, 
		RULE_lookupRange = 8, RULE_lookupPointList = 9, RULE_lookupPoint = 10;
	public static final String[] ruleNames = {
		"model", "equation", "lhs", "subscriptList", "constList", "expr", "exprList", 
		"lookup", "lookupRange", "lookupPointList", "lookupPoint"
	};

	private static final String[] _LITERAL_NAMES = {
		null, "'['", "','", "']'", "'('", "')'", "':NOT:'", "'^'", "':AND:'", 
		"':OR:'", null, null, null, "'*'", "'/'", "'+'", "'-'", "'<'", "'<='", 
		"'>'", "'>='", "'='", "'=='", "'<>'", "'!'", null, null, null, "':NA:'"
	};
	private static final String[] _SYMBOLIC_NAMES = {
		null, null, null, null, null, null, null, null, null, null, "Encoding", 
		"UnitsDoc", "Group", "Star", "Div", "Plus", "Minus", "Less", "LessEqual", 
		"Greater", "GreaterEqual", "Equal", "TwoEqual", "NotEqual", "Exclamation", 
		"Id", "Const", "StringLiteral", "Keyword", "Whitespace"
	};
	public static final Vocabulary VOCABULARY = new VocabularyImpl(_LITERAL_NAMES, _SYMBOLIC_NAMES);

	/**
	 * @deprecated Use {@link #VOCABULARY} instead.
	 */
	@Deprecated
	public static final String[] tokenNames;
	static {
		tokenNames = new String[_SYMBOLIC_NAMES.length];
		for (int i = 0; i < tokenNames.length; i++) {
			tokenNames[i] = VOCABULARY.getLiteralName(i);
			if (tokenNames[i] == null) {
				tokenNames[i] = VOCABULARY.getSymbolicName(i);
			}

			if (tokenNames[i] == null) {
				tokenNames[i] = "<INVALID>";
			}
		}
	}

	@Override
	@Deprecated
	public String[] getTokenNames() {
		return tokenNames;
	}

	@Override

	public Vocabulary getVocabulary() {
		return VOCABULARY;
	}

	@Override
	public String getGrammarFileName() { return "Model.g4"; }

	@Override
	public String[] getRuleNames() { return ruleNames; }

	@Override
	public String getSerializedATN() { return _serializedATN; }

	@Override
	public ATN getATN() { return _ATN; }

	public ModelParser(TokenStream input) {
		super(input);
		_interp = new ParserATNSimulator(this,_ATN,_decisionToDFA,_sharedContextCache);
	}
	public static class ModelContext extends ParserRuleContext {
		public List<EquationContext> equation() {
			return getRuleContexts(EquationContext.class);
		}
		public EquationContext equation(int i) {
			return getRuleContext(EquationContext.class,i);
		}
		public ModelContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_model; }
	}

	public final ModelContext model() throws RecognitionException {
		ModelContext _localctx = new ModelContext(_ctx, getState());
		enterRule(_localctx, 0, RULE_model);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(23); 
			_errHandler.sync(this);
			_la = _input.LA(1);
			do {
				{
				{
				setState(22);
				equation();
				}
				}
				setState(25); 
				_errHandler.sync(this);
				_la = _input.LA(1);
			} while ( _la==Id );
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class EquationContext extends ParserRuleContext {
		public LhsContext lhs() {
			return getRuleContext(LhsContext.class,0);
		}
		public LookupContext lookup() {
			return getRuleContext(LookupContext.class,0);
		}
		public ExprContext expr() {
			return getRuleContext(ExprContext.class,0);
		}
		public ConstListContext constList() {
			return getRuleContext(ConstListContext.class,0);
		}
		public EquationContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_equation; }
	}

	public final EquationContext equation() throws RecognitionException {
		EquationContext _localctx = new EquationContext(_ctx, getState());
		enterRule(_localctx, 2, RULE_equation);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(27);
			lhs();
			setState(34);
			switch (_input.LA(1)) {
			case Equal:
			case TwoEqual:
				{
				setState(28);
				_la = _input.LA(1);
				if ( !(_la==Equal || _la==TwoEqual) ) {
				_errHandler.recoverInline(this);
				} else {
					consume();
				}
				setState(31);
				switch ( getInterpreter().adaptivePredict(_input,1,_ctx) ) {
				case 1:
					{
					setState(29);
					expr(0);
					}
					break;
				case 2:
					{
					setState(30);
					constList();
					}
					break;
				}
				}
				break;
			case T__3:
				{
				setState(33);
				lookup();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class LhsContext extends ParserRuleContext {
		public TerminalNode Id() { return getToken(ModelParser.Id, 0); }
		public SubscriptListContext subscriptList() {
			return getRuleContext(SubscriptListContext.class,0);
		}
		public LhsContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_lhs; }
	}

	public final LhsContext lhs() throws RecognitionException {
		LhsContext _localctx = new LhsContext(_ctx, getState());
		enterRule(_localctx, 4, RULE_lhs);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(36);
			match(Id);
			setState(38);
			_la = _input.LA(1);
			if (_la==T__0) {
				{
				setState(37);
				subscriptList();
				}
			}

			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class SubscriptListContext extends ParserRuleContext {
		public List<TerminalNode> Id() { return getTokens(ModelParser.Id); }
		public TerminalNode Id(int i) {
			return getToken(ModelParser.Id, i);
		}
		public SubscriptListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_subscriptList; }
	}

	public final SubscriptListContext subscriptList() throws RecognitionException {
		SubscriptListContext _localctx = new SubscriptListContext(_ctx, getState());
		enterRule(_localctx, 6, RULE_subscriptList);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(40);
			match(T__0);
			setState(41);
			match(Id);
			setState(46);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==T__1) {
				{
				{
				setState(42);
				match(T__1);
				setState(43);
				match(Id);
				}
				}
				setState(48);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			setState(49);
			match(T__2);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class ConstListContext extends ParserRuleContext {
		public List<TerminalNode> Const() { return getTokens(ModelParser.Const); }
		public TerminalNode Const(int i) {
			return getToken(ModelParser.Const, i);
		}
		public ConstListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_constList; }
	}

	public final ConstListContext constList() throws RecognitionException {
		ConstListContext _localctx = new ConstListContext(_ctx, getState());
		enterRule(_localctx, 8, RULE_constList);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(54);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==Plus || _la==Minus) {
				{
				{
				setState(51);
				_la = _input.LA(1);
				if ( !(_la==Plus || _la==Minus) ) {
				_errHandler.recoverInline(this);
				} else {
					consume();
				}
				}
				}
				setState(56);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			setState(57);
			match(Const);
			setState(68);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==T__1) {
				{
				{
				setState(58);
				match(T__1);
				setState(62);
				_errHandler.sync(this);
				_la = _input.LA(1);
				while (_la==Plus || _la==Minus) {
					{
					{
					setState(59);
					_la = _input.LA(1);
					if ( !(_la==Plus || _la==Minus) ) {
					_errHandler.recoverInline(this);
					} else {
						consume();
					}
					}
					}
					setState(64);
					_errHandler.sync(this);
					_la = _input.LA(1);
				}
				setState(65);
				match(Const);
				}
				}
				setState(70);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class ExprContext extends ParserRuleContext {
		public ExprContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_expr; }
	 
		public ExprContext() { }
		public void copyFrom(ExprContext ctx) {
			super.copyFrom(ctx);
		}
	}
	public static class CallContext extends ExprContext {
		public TerminalNode Id() { return getToken(ModelParser.Id, 0); }
		public ExprListContext exprList() {
			return getRuleContext(ExprListContext.class,0);
		}
		public CallContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class OrContext extends ExprContext {
		public List<ExprContext> expr() {
			return getRuleContexts(ExprContext.class);
		}
		public ExprContext expr(int i) {
			return getRuleContext(ExprContext.class,i);
		}
		public OrContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class KeywordContext extends ExprContext {
		public TerminalNode Keyword() { return getToken(ModelParser.Keyword, 0); }
		public KeywordContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class MulDivContext extends ExprContext {
		public Token op;
		public List<ExprContext> expr() {
			return getRuleContexts(ExprContext.class);
		}
		public ExprContext expr(int i) {
			return getRuleContext(ExprContext.class,i);
		}
		public MulDivContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class AddSubContext extends ExprContext {
		public Token op;
		public List<ExprContext> expr() {
			return getRuleContexts(ExprContext.class);
		}
		public ExprContext expr(int i) {
			return getRuleContext(ExprContext.class,i);
		}
		public AddSubContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class VarContext extends ExprContext {
		public TerminalNode Id() { return getToken(ModelParser.Id, 0); }
		public SubscriptListContext subscriptList() {
			return getRuleContext(SubscriptListContext.class,0);
		}
		public VarContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class ParensContext extends ExprContext {
		public ExprContext expr() {
			return getRuleContext(ExprContext.class,0);
		}
		public ParensContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class ConstContext extends ExprContext {
		public TerminalNode Const() { return getToken(ModelParser.Const, 0); }
		public ConstContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class RelationalContext extends ExprContext {
		public Token op;
		public List<ExprContext> expr() {
			return getRuleContexts(ExprContext.class);
		}
		public ExprContext expr(int i) {
			return getRuleContext(ExprContext.class,i);
		}
		public RelationalContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class LookupCallContext extends ExprContext {
		public TerminalNode Id() { return getToken(ModelParser.Id, 0); }
		public ExprContext expr() {
			return getRuleContext(ExprContext.class,0);
		}
		public SubscriptListContext subscriptList() {
			return getRuleContext(SubscriptListContext.class,0);
		}
		public LookupCallContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class NotContext extends ExprContext {
		public ExprContext expr() {
			return getRuleContext(ExprContext.class,0);
		}
		public NotContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class NegativeContext extends ExprContext {
		public ExprContext expr() {
			return getRuleContext(ExprContext.class,0);
		}
		public NegativeContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class PositiveContext extends ExprContext {
		public ExprContext expr() {
			return getRuleContext(ExprContext.class,0);
		}
		public PositiveContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class AndContext extends ExprContext {
		public List<ExprContext> expr() {
			return getRuleContexts(ExprContext.class);
		}
		public ExprContext expr(int i) {
			return getRuleContext(ExprContext.class,i);
		}
		public AndContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class EqualityContext extends ExprContext {
		public Token op;
		public List<ExprContext> expr() {
			return getRuleContexts(ExprContext.class);
		}
		public ExprContext expr(int i) {
			return getRuleContext(ExprContext.class,i);
		}
		public EqualityContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class LookupArgContext extends ExprContext {
		public LookupContext lookup() {
			return getRuleContext(LookupContext.class,0);
		}
		public LookupArgContext(ExprContext ctx) { copyFrom(ctx); }
	}
	public static class PowerContext extends ExprContext {
		public List<ExprContext> expr() {
			return getRuleContexts(ExprContext.class);
		}
		public ExprContext expr(int i) {
			return getRuleContext(ExprContext.class,i);
		}
		public PowerContext(ExprContext ctx) { copyFrom(ctx); }
	}

	public final ExprContext expr() throws RecognitionException {
		return expr(0);
	}

	private ExprContext expr(int _p) throws RecognitionException {
		ParserRuleContext _parentctx = _ctx;
		int _parentState = getState();
		ExprContext _localctx = new ExprContext(_ctx, _parentState);
		ExprContext _prevctx = _localctx;
		int _startState = 10;
		enterRecursionRule(_localctx, 10, RULE_expr, _p);
		int _la;
		try {
			int _alt;
			enterOuterAlt(_localctx, 1);
			{
			setState(103);
			switch ( getInterpreter().adaptivePredict(_input,11,_ctx) ) {
			case 1:
				{
				_localctx = new NotContext(_localctx);
				_ctx = _localctx;
				_prevctx = _localctx;

				setState(72);
				match(T__5);
				setState(73);
				expr(15);
				}
				break;
			case 2:
				{
				_localctx = new NegativeContext(_localctx);
				_ctx = _localctx;
				_prevctx = _localctx;
				setState(74);
				match(Minus);
				setState(75);
				expr(14);
				}
				break;
			case 3:
				{
				_localctx = new PositiveContext(_localctx);
				_ctx = _localctx;
				_prevctx = _localctx;
				setState(76);
				match(Plus);
				setState(77);
				expr(13);
				}
				break;
			case 4:
				{
				_localctx = new CallContext(_localctx);
				_ctx = _localctx;
				_prevctx = _localctx;
				setState(78);
				match(Id);
				setState(79);
				match(T__3);
				setState(81);
				_la = _input.LA(1);
				if ((((_la) & ~0x3f) == 0 && ((1L << _la) & ((1L << T__3) | (1L << T__5) | (1L << Plus) | (1L << Minus) | (1L << Id) | (1L << Const) | (1L << Keyword))) != 0)) {
					{
					setState(80);
					exprList();
					}
				}

				setState(83);
				match(T__4);
				}
				break;
			case 5:
				{
				_localctx = new LookupCallContext(_localctx);
				_ctx = _localctx;
				_prevctx = _localctx;
				setState(84);
				match(Id);
				setState(86);
				_la = _input.LA(1);
				if (_la==T__0) {
					{
					setState(85);
					subscriptList();
					}
				}

				setState(88);
				match(T__3);
				setState(89);
				expr(0);
				setState(90);
				match(T__4);
				}
				break;
			case 6:
				{
				_localctx = new VarContext(_localctx);
				_ctx = _localctx;
				_prevctx = _localctx;
				setState(92);
				match(Id);
				setState(94);
				switch ( getInterpreter().adaptivePredict(_input,10,_ctx) ) {
				case 1:
					{
					setState(93);
					subscriptList();
					}
					break;
				}
				}
				break;
			case 7:
				{
				_localctx = new ConstContext(_localctx);
				_ctx = _localctx;
				_prevctx = _localctx;
				setState(96);
				match(Const);
				}
				break;
			case 8:
				{
				_localctx = new KeywordContext(_localctx);
				_ctx = _localctx;
				_prevctx = _localctx;
				setState(97);
				match(Keyword);
				}
				break;
			case 9:
				{
				_localctx = new LookupArgContext(_localctx);
				_ctx = _localctx;
				_prevctx = _localctx;
				setState(98);
				lookup();
				}
				break;
			case 10:
				{
				_localctx = new ParensContext(_localctx);
				_ctx = _localctx;
				_prevctx = _localctx;
				setState(99);
				match(T__3);
				setState(100);
				expr(0);
				setState(101);
				match(T__4);
				}
				break;
			}
			_ctx.stop = _input.LT(-1);
			setState(128);
			_errHandler.sync(this);
			_alt = getInterpreter().adaptivePredict(_input,13,_ctx);
			while ( _alt!=2 && _alt!=org.antlr.v4.runtime.atn.ATN.INVALID_ALT_NUMBER ) {
				if ( _alt==1 ) {
					if ( _parseListeners!=null ) triggerExitRuleEvent();
					_prevctx = _localctx;
					{
					setState(126);
					switch ( getInterpreter().adaptivePredict(_input,12,_ctx) ) {
					case 1:
						{
						_localctx = new PowerContext(new ExprContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expr);
						setState(105);
						if (!(precpred(_ctx, 12))) throw new FailedPredicateException(this, "precpred(_ctx, 12)");
						setState(106);
						match(T__6);
						setState(107);
						expr(13);
						}
						break;
					case 2:
						{
						_localctx = new MulDivContext(new ExprContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expr);
						setState(108);
						if (!(precpred(_ctx, 11))) throw new FailedPredicateException(this, "precpred(_ctx, 11)");
						setState(109);
						((MulDivContext)_localctx).op = _input.LT(1);
						_la = _input.LA(1);
						if ( !(_la==Star || _la==Div) ) {
							((MulDivContext)_localctx).op = (Token)_errHandler.recoverInline(this);
						} else {
							consume();
						}
						setState(110);
						expr(12);
						}
						break;
					case 3:
						{
						_localctx = new AddSubContext(new ExprContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expr);
						setState(111);
						if (!(precpred(_ctx, 10))) throw new FailedPredicateException(this, "precpred(_ctx, 10)");
						setState(112);
						((AddSubContext)_localctx).op = _input.LT(1);
						_la = _input.LA(1);
						if ( !(_la==Plus || _la==Minus) ) {
							((AddSubContext)_localctx).op = (Token)_errHandler.recoverInline(this);
						} else {
							consume();
						}
						setState(113);
						expr(11);
						}
						break;
					case 4:
						{
						_localctx = new RelationalContext(new ExprContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expr);
						setState(114);
						if (!(precpred(_ctx, 9))) throw new FailedPredicateException(this, "precpred(_ctx, 9)");
						setState(115);
						((RelationalContext)_localctx).op = _input.LT(1);
						_la = _input.LA(1);
						if ( !((((_la) & ~0x3f) == 0 && ((1L << _la) & ((1L << Less) | (1L << LessEqual) | (1L << Greater) | (1L << GreaterEqual))) != 0)) ) {
							((RelationalContext)_localctx).op = (Token)_errHandler.recoverInline(this);
						} else {
							consume();
						}
						setState(116);
						expr(10);
						}
						break;
					case 5:
						{
						_localctx = new EqualityContext(new ExprContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expr);
						setState(117);
						if (!(precpred(_ctx, 8))) throw new FailedPredicateException(this, "precpred(_ctx, 8)");
						setState(118);
						((EqualityContext)_localctx).op = _input.LT(1);
						_la = _input.LA(1);
						if ( !(_la==Equal || _la==NotEqual) ) {
							((EqualityContext)_localctx).op = (Token)_errHandler.recoverInline(this);
						} else {
							consume();
						}
						setState(119);
						expr(9);
						}
						break;
					case 6:
						{
						_localctx = new AndContext(new ExprContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expr);
						setState(120);
						if (!(precpred(_ctx, 7))) throw new FailedPredicateException(this, "precpred(_ctx, 7)");
						setState(121);
						match(T__7);
						setState(122);
						expr(8);
						}
						break;
					case 7:
						{
						_localctx = new OrContext(new ExprContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expr);
						setState(123);
						if (!(precpred(_ctx, 6))) throw new FailedPredicateException(this, "precpred(_ctx, 6)");
						setState(124);
						match(T__8);
						setState(125);
						expr(7);
						}
						break;
					}
					} 
				}
				setState(130);
				_errHandler.sync(this);
				_alt = getInterpreter().adaptivePredict(_input,13,_ctx);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			unrollRecursionContexts(_parentctx);
		}
		return _localctx;
	}

	public static class ExprListContext extends ParserRuleContext {
		public List<ExprContext> expr() {
			return getRuleContexts(ExprContext.class);
		}
		public ExprContext expr(int i) {
			return getRuleContext(ExprContext.class,i);
		}
		public ExprListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_exprList; }
	}

	public final ExprListContext exprList() throws RecognitionException {
		ExprListContext _localctx = new ExprListContext(_ctx, getState());
		enterRule(_localctx, 12, RULE_exprList);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(131);
			expr(0);
			setState(136);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==T__1) {
				{
				{
				setState(132);
				match(T__1);
				setState(133);
				expr(0);
				}
				}
				setState(138);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class LookupContext extends ParserRuleContext {
		public LookupPointListContext lookupPointList() {
			return getRuleContext(LookupPointListContext.class,0);
		}
		public LookupRangeContext lookupRange() {
			return getRuleContext(LookupRangeContext.class,0);
		}
		public LookupContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_lookup; }
	}

	public final LookupContext lookup() throws RecognitionException {
		LookupContext _localctx = new LookupContext(_ctx, getState());
		enterRule(_localctx, 14, RULE_lookup);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(139);
			match(T__3);
			setState(141);
			_la = _input.LA(1);
			if (_la==T__0) {
				{
				setState(140);
				lookupRange();
				}
			}

			setState(143);
			lookupPointList();
			setState(144);
			match(T__4);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class LookupRangeContext extends ParserRuleContext {
		public List<LookupPointContext> lookupPoint() {
			return getRuleContexts(LookupPointContext.class);
		}
		public LookupPointContext lookupPoint(int i) {
			return getRuleContext(LookupPointContext.class,i);
		}
		public LookupRangeContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_lookupRange; }
	}

	public final LookupRangeContext lookupRange() throws RecognitionException {
		LookupRangeContext _localctx = new LookupRangeContext(_ctx, getState());
		enterRule(_localctx, 16, RULE_lookupRange);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(146);
			match(T__0);
			setState(147);
			lookupPoint();
			setState(148);
			match(Minus);
			setState(149);
			lookupPoint();
			setState(150);
			match(T__2);
			setState(151);
			match(T__1);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class LookupPointListContext extends ParserRuleContext {
		public List<LookupPointContext> lookupPoint() {
			return getRuleContexts(LookupPointContext.class);
		}
		public LookupPointContext lookupPoint(int i) {
			return getRuleContext(LookupPointContext.class,i);
		}
		public LookupPointListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_lookupPointList; }
	}

	public final LookupPointListContext lookupPointList() throws RecognitionException {
		LookupPointListContext _localctx = new LookupPointListContext(_ctx, getState());
		enterRule(_localctx, 18, RULE_lookupPointList);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(153);
			lookupPoint();
			setState(158);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==T__1) {
				{
				{
				setState(154);
				match(T__1);
				setState(155);
				lookupPoint();
				}
				}
				setState(160);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class LookupPointContext extends ParserRuleContext {
		public List<ExprContext> expr() {
			return getRuleContexts(ExprContext.class);
		}
		public ExprContext expr(int i) {
			return getRuleContext(ExprContext.class,i);
		}
		public LookupPointContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_lookupPoint; }
	}

	public final LookupPointContext lookupPoint() throws RecognitionException {
		LookupPointContext _localctx = new LookupPointContext(_ctx, getState());
		enterRule(_localctx, 20, RULE_lookupPoint);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(161);
			match(T__3);
			setState(162);
			expr(0);
			setState(163);
			match(T__1);
			setState(164);
			expr(0);
			setState(165);
			match(T__4);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public boolean sempred(RuleContext _localctx, int ruleIndex, int predIndex) {
		switch (ruleIndex) {
		case 5:
			return expr_sempred((ExprContext)_localctx, predIndex);
		}
		return true;
	}
	private boolean expr_sempred(ExprContext _localctx, int predIndex) {
		switch (predIndex) {
		case 0:
			return precpred(_ctx, 12);
		case 1:
			return precpred(_ctx, 11);
		case 2:
			return precpred(_ctx, 10);
		case 3:
			return precpred(_ctx, 9);
		case 4:
			return precpred(_ctx, 8);
		case 5:
			return precpred(_ctx, 7);
		case 6:
			return precpred(_ctx, 6);
		}
		return true;
	}

	public static final String _serializedATN =
		"\3\u0430\ud6d1\u8206\uad2d\u4417\uaef1\u8d80\uaadd\3\37\u00aa\4\2\t\2"+
		"\4\3\t\3\4\4\t\4\4\5\t\5\4\6\t\6\4\7\t\7\4\b\t\b\4\t\t\t\4\n\t\n\4\13"+
		"\t\13\4\f\t\f\3\2\6\2\32\n\2\r\2\16\2\33\3\3\3\3\3\3\3\3\5\3\"\n\3\3\3"+
		"\5\3%\n\3\3\4\3\4\5\4)\n\4\3\5\3\5\3\5\3\5\7\5/\n\5\f\5\16\5\62\13\5\3"+
		"\5\3\5\3\6\7\6\67\n\6\f\6\16\6:\13\6\3\6\3\6\3\6\7\6?\n\6\f\6\16\6B\13"+
		"\6\3\6\7\6E\n\6\f\6\16\6H\13\6\3\7\3\7\3\7\3\7\3\7\3\7\3\7\3\7\3\7\3\7"+
		"\5\7T\n\7\3\7\3\7\3\7\5\7Y\n\7\3\7\3\7\3\7\3\7\3\7\3\7\5\7a\n\7\3\7\3"+
		"\7\3\7\3\7\3\7\3\7\3\7\5\7j\n\7\3\7\3\7\3\7\3\7\3\7\3\7\3\7\3\7\3\7\3"+
		"\7\3\7\3\7\3\7\3\7\3\7\3\7\3\7\3\7\3\7\3\7\3\7\7\7\u0081\n\7\f\7\16\7"+
		"\u0084\13\7\3\b\3\b\3\b\7\b\u0089\n\b\f\b\16\b\u008c\13\b\3\t\3\t\5\t"+
		"\u0090\n\t\3\t\3\t\3\t\3\n\3\n\3\n\3\n\3\n\3\n\3\n\3\13\3\13\3\13\7\13"+
		"\u009f\n\13\f\13\16\13\u00a2\13\13\3\f\3\f\3\f\3\f\3\f\3\f\3\f\2\3\f\r"+
		"\2\4\6\b\n\f\16\20\22\24\26\2\7\3\2\27\30\3\2\21\22\3\2\17\20\3\2\23\26"+
		"\4\2\27\27\31\31\u00bc\2\31\3\2\2\2\4\35\3\2\2\2\6&\3\2\2\2\b*\3\2\2\2"+
		"\n8\3\2\2\2\fi\3\2\2\2\16\u0085\3\2\2\2\20\u008d\3\2\2\2\22\u0094\3\2"+
		"\2\2\24\u009b\3\2\2\2\26\u00a3\3\2\2\2\30\32\5\4\3\2\31\30\3\2\2\2\32"+
		"\33\3\2\2\2\33\31\3\2\2\2\33\34\3\2\2\2\34\3\3\2\2\2\35$\5\6\4\2\36!\t"+
		"\2\2\2\37\"\5\f\7\2 \"\5\n\6\2!\37\3\2\2\2! \3\2\2\2\"%\3\2\2\2#%\5\20"+
		"\t\2$\36\3\2\2\2$#\3\2\2\2%\5\3\2\2\2&(\7\33\2\2\')\5\b\5\2(\'\3\2\2\2"+
		"()\3\2\2\2)\7\3\2\2\2*+\7\3\2\2+\60\7\33\2\2,-\7\4\2\2-/\7\33\2\2.,\3"+
		"\2\2\2/\62\3\2\2\2\60.\3\2\2\2\60\61\3\2\2\2\61\63\3\2\2\2\62\60\3\2\2"+
		"\2\63\64\7\5\2\2\64\t\3\2\2\2\65\67\t\3\2\2\66\65\3\2\2\2\67:\3\2\2\2"+
		"8\66\3\2\2\289\3\2\2\29;\3\2\2\2:8\3\2\2\2;F\7\34\2\2<@\7\4\2\2=?\t\3"+
		"\2\2>=\3\2\2\2?B\3\2\2\2@>\3\2\2\2@A\3\2\2\2AC\3\2\2\2B@\3\2\2\2CE\7\34"+
		"\2\2D<\3\2\2\2EH\3\2\2\2FD\3\2\2\2FG\3\2\2\2G\13\3\2\2\2HF\3\2\2\2IJ\b"+
		"\7\1\2JK\7\b\2\2Kj\5\f\7\21LM\7\22\2\2Mj\5\f\7\20NO\7\21\2\2Oj\5\f\7\17"+
		"PQ\7\33\2\2QS\7\6\2\2RT\5\16\b\2SR\3\2\2\2ST\3\2\2\2TU\3\2\2\2Uj\7\7\2"+
		"\2VX\7\33\2\2WY\5\b\5\2XW\3\2\2\2XY\3\2\2\2YZ\3\2\2\2Z[\7\6\2\2[\\\5\f"+
		"\7\2\\]\7\7\2\2]j\3\2\2\2^`\7\33\2\2_a\5\b\5\2`_\3\2\2\2`a\3\2\2\2aj\3"+
		"\2\2\2bj\7\34\2\2cj\7\36\2\2dj\5\20\t\2ef\7\6\2\2fg\5\f\7\2gh\7\7\2\2"+
		"hj\3\2\2\2iI\3\2\2\2iL\3\2\2\2iN\3\2\2\2iP\3\2\2\2iV\3\2\2\2i^\3\2\2\2"+
		"ib\3\2\2\2ic\3\2\2\2id\3\2\2\2ie\3\2\2\2j\u0082\3\2\2\2kl\f\16\2\2lm\7"+
		"\t\2\2m\u0081\5\f\7\17no\f\r\2\2op\t\4\2\2p\u0081\5\f\7\16qr\f\f\2\2r"+
		"s\t\3\2\2s\u0081\5\f\7\rtu\f\13\2\2uv\t\5\2\2v\u0081\5\f\7\fwx\f\n\2\2"+
		"xy\t\6\2\2y\u0081\5\f\7\13z{\f\t\2\2{|\7\n\2\2|\u0081\5\f\7\n}~\f\b\2"+
		"\2~\177\7\13\2\2\177\u0081\5\f\7\t\u0080k\3\2\2\2\u0080n\3\2\2\2\u0080"+
		"q\3\2\2\2\u0080t\3\2\2\2\u0080w\3\2\2\2\u0080z\3\2\2\2\u0080}\3\2\2\2"+
		"\u0081\u0084\3\2\2\2\u0082\u0080\3\2\2\2\u0082\u0083\3\2\2\2\u0083\r\3"+
		"\2\2\2\u0084\u0082\3\2\2\2\u0085\u008a\5\f\7\2\u0086\u0087\7\4\2\2\u0087"+
		"\u0089\5\f\7\2\u0088\u0086\3\2\2\2\u0089\u008c\3\2\2\2\u008a\u0088\3\2"+
		"\2\2\u008a\u008b\3\2\2\2\u008b\17\3\2\2\2\u008c\u008a\3\2\2\2\u008d\u008f"+
		"\7\6\2\2\u008e\u0090\5\22\n\2\u008f\u008e\3\2\2\2\u008f\u0090\3\2\2\2"+
		"\u0090\u0091\3\2\2\2\u0091\u0092\5\24\13\2\u0092\u0093\7\7\2\2\u0093\21"+
		"\3\2\2\2\u0094\u0095\7\3\2\2\u0095\u0096\5\26\f\2\u0096\u0097\7\22\2\2"+
		"\u0097\u0098\5\26\f\2\u0098\u0099\7\5\2\2\u0099\u009a\7\4\2\2\u009a\23"+
		"\3\2\2\2\u009b\u00a0\5\26\f\2\u009c\u009d\7\4\2\2\u009d\u009f\5\26\f\2"+
		"\u009e\u009c\3\2\2\2\u009f\u00a2\3\2\2\2\u00a0\u009e\3\2\2\2\u00a0\u00a1"+
		"\3\2\2\2\u00a1\25\3\2\2\2\u00a2\u00a0\3\2\2\2\u00a3\u00a4\7\6\2\2\u00a4"+
		"\u00a5\5\f\7\2\u00a5\u00a6\7\4\2\2\u00a6\u00a7\5\f\7\2\u00a7\u00a8\7\7"+
		"\2\2\u00a8\27\3\2\2\2\23\33!$(\608@FSX`i\u0080\u0082\u008a\u008f\u00a0";
	public static final ATN _ATN =
		new ATNDeserializer().deserialize(_serializedATN.toCharArray());
	static {
		_decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
		for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
			_decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
		}
	}
}